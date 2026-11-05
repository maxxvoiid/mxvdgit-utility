import {
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---- meme mapping -----------------------------------------------------
// Each gesture maps to one or more meme images. When a gesture has more
// than one image, one is picked at random each time the gesture is newly
// (re)triggered, so repeated gestures don't always show the same frame.
const GESTURE_MEMES = {
  rockstar: ["memes/cat.jpg"],
  default: ["memes/pokercat.jpg"],
  oneFingerUp: ["memes/profcat.jpg", "memes/professorcat.jpg"],
  fist: ["memes/punchcat.jpg"],
  shhh: ["memes/shhcat.jpg"],
  twoFingersTogether: [
    "memes/uwucat.jpg",
    "memes/uwucatt.jpg",
    "memes/fingers together muehehe .jpg",
  ],
  handCoverFace: ["memes/hand cover face .jpg"],
  crashOutCat: ["memes/crashout cat .jpg"],
  twoHandsOnHead: ["memes/two hands on head .jpg"],
  handStretchedOut: ["memes/hand stretched out, palm facing up .jpg"],
  sideEyeCat: ["memes/side eye cat.jpg"],
  middleFinger: ["memes/middle-finger.png"],
};

// how many consecutive frames a gesture must hold before we switch to it
const STABLE_FRAMES_REQUIRED = 5;
// if no hand / no gesture is seen for this long, fall back to default
const DEFAULT_FALLBACK_MS = 600;
// how long we trust a stale face box after the face detector loses the face
// (e.g. hand covering the mouth during a shush)
const FACE_STALE_MS = 1200;

// how far the head has to turn (yaw, in degrees, from MediaPipe's own head
// pose estimate - not a hand-rolled distance heuristic) to count as a
// side-eye look. Watch the live debug HUD in the camera pane while turning
// your head to find the right value for you.
const SIDE_EYE_YAW_DEG = 15.0;

// hand-covering-face: how close the hand needs to be to where the mouth
// last was. Wider when the face detector has fully lost the face (strong
// evidence of a real occlusion); tighter when the face is still partially
// tracked (weaker evidence, avoid false positives from a hand just passing
// near the face).
const HAND_COVER_FACE_DIST_FACE_LOST = 1.3;
const HAND_COVER_FACE_DIST_FACE_SEEN = 0.7;

const video = document.getElementById("video");
const memeImg = document.getElementById("memeImg");
const debugHud = document.getElementById("debugHud");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");
const drawingUtils = new DrawingUtils(overlayCtx);

// debug overlay (hand points, finger states, face references). Tap the
// camera to hide/show it, or open the page with ?debug=0 to start hidden.
let debugOn = new URLSearchParams(location.search).get("debug") !== "0";
let lastHandResult = null;
let lastRawGesture = "default";
let fps = 0;
let fpsFrames = 0;
let fpsSince = performance.now();

let handLandmarker, faceLandmarker;
let lastVideoTime = -1;
let currentGesture = "default";
let candidateGesture = "default";
let candidateStreak = 0;
let lastNonDefaultAt = performance.now();
let lastFace = null; // { mouthCenter, faceWidth, mouthOpen, yawDeg, t }
let lastFaceSeenThisFrame = false;
let lastYawDebug = 0;

async function init() {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  // the overlay canvas uses the camera's native resolution and the same CSS
  // (object-fit + mirroring) as the <video>, so normalized landmark
  // coordinates line up exactly with what's on screen.
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
  video.parentElement.addEventListener("click", () => {
    debugOn = !debugOn;
    drawOverlay();
    updateDebugHud();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "d" || e.key === "D") {
      debugOn = !debugOn;
      drawOverlay();
      updateDebugHud();
    }
  });

  requestAnimationFrame(loop);
}

// ---- 3D-aware geometry helpers -----------------------------------------
// Using z (depth) as well as x/y makes these tests far more robust to hand
// rotation, foreshortening, and motion blur than a plain 2D/wrist-distance
// check would be.
function vec(a, b) {
  return { x: b.x - a.x, y: b.y - a.y, z: (b.z || 0) - (a.z || 0) };
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}
function angleDeg(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.hypot(v1.x, v1.y, v1.z);
  const m2 = Math.hypot(v2.x, v2.y, v2.z);
  if (m1 < 1e-9 || m2 < 1e-9) return 180;
  return (Math.acos(Math.min(1, Math.max(-1, dot / (m1 * m2)))) * 180) / Math.PI;
}

// a finger is "extended" if its two segments (mcp->pip, pip->tip) point in
// roughly the same direction; "curled" if it folds back sharply.
function fingerExtended(lm, mcp, pip, tip) {
  const angle = angleDeg(vec(lm[mcp], lm[pip]), vec(lm[pip], lm[tip]));
  return angle < 45;
}

// extract the head's left/right turn angle (yaw, degrees) from MediaPipe's
// facial transformation matrix - its own estimate of head pose, far more
// robust than trying to infer turn from landmark distances.
function yawFromTransformMatrix(matrixData) {
  // matrixData is a 16-element row-major 4x4 array; r(row, col) = data[row*4+col]
  const r00 = matrixData[0];
  const r10 = matrixData[4];
  const r20 = matrixData[8];
  const sy = Math.hypot(r00, r10);
  if (sy < 1e-6) return 0;
  return (Math.atan2(-r20, sy) * 180) / Math.PI;
}

function classifyHand(lm) {
  const handScale = dist(lm[0], lm[9]) || 1e-6; // wrist -> middle mcp

  const indexUp = fingerExtended(lm, 5, 6, 8);
  const middleUp = fingerExtended(lm, 9, 10, 12);
  const ringUp = fingerExtended(lm, 13, 14, 16);
  const pinkyUp = fingerExtended(lm, 17, 18, 20);

  // thumb + pinky spread apart from each other = shaka/rock-on shape.
  // tucked thumb sits close to the pinky-side of the palm; an abducted
  // thumb sticks straight out and this distance grows a lot.
  const thumbPinkySpread = dist(lm[4], lm[17]) / handScale;
  const thumbOut = thumbPinkySpread > 1.05;

  const curledCount = [indexUp, middleUp, ringUp, pinkyUp].filter((v) => !v).length;

  return {
    indexUp,
    middleUp,
    ringUp,
    pinkyUp,
    thumbOut,
    curledCount,
    handScale,
    indexTip: lm[8],
    wrist: lm[0],
    palmCenter: lm[9],
  };
}

function updateFace(faceResult) {
  const now = performance.now();
  const sawFace = !!(faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0);

  if (sawFace) {
    const f = faceResult.faceLandmarks[0];
    const upperLip = f[13];
    const lowerLip = f[14];
    const rightCheek = f[234];
    const leftCheek = f[454];
    const mouthCenter = {
      x: (upperLip.x + lowerLip.x) / 2,
      y: (upperLip.y + lowerLip.y) / 2,
      z: ((upperLip.z || 0) + (lowerLip.z || 0)) / 2,
    };
    const faceWidth = dist(rightCheek, leftCheek);
    // how open the mouth is right now - normalized so it doesn't depend on
    // distance from the camera.
    const mouthOpen = dist(upperLip, lowerLip) / faceWidth;

    let yawDeg = 0;
    if (faceResult.facialTransformationMatrixes && faceResult.facialTransformationMatrixes.length > 0) {
      yawDeg = yawFromTransformMatrix(faceResult.facialTransformationMatrixes[0].data);
    }

    lastFace = { mouthCenter, faceWidth, mouthOpen, yawDeg, t: now };
    lastYawDebug = yawDeg;
  }
  lastFaceSeenThisFrame = sawFace;
}

// a hand is "pointing" if only the index finger is extended (thumb can be
// either way) - the shape both hands make in the finger-tips-touching pose.
function isPointing(h) {
  return h.indexUp && !h.middleUp && !h.ringUp && !h.pinkyUp;
}

// only the middle finger extended (thumb can be either way)
function isMiddleFinger(h) {
  return h.middleUp && !h.indexUp && !h.ringUp && !h.pinkyUp;
}

function decideGesture(handResult) {
  const now = performance.now();
  const faceIsFresh = !!lastFace && now - lastFace.t < FACE_STALE_MS;

  if (!handResult.landmarks || handResult.landmarks.length === 0) {
    // no hands: side-eye is a face-only pose (head turned, no particular
    // hand shape needed).
    if (faceIsFresh && Math.abs(lastFace.yawDeg) > SIDE_EYE_YAW_DEG) {
      return "sideEyeCat";
    }
    return "default";
  }

  const hands = handResult.landmarks.map(classifyHand);

  // middle finger: very specific shape, so it wins over everything else
  // (on either hand when two are visible).
  if (hands.some(isMiddleFinger)) {
    return "middleFinger";
  }

  if (hands.length === 2) {
    // two fingers pointing together: both hands pointing with just the
    // index finger, fingertips close to each other in the frame.
    if (isPointing(hands[0]) && isPointing(hands[1])) {
      const avgScale = (hands[0].handScale + hands[1].handScale) / 2;
      const tipGap = dist(hands[0].indexTip, hands[1].indexTip) / avgScale;
      if (tipGap < 1.4) {
        return "twoFingersTogether";
      }
    }

    // two hands up near the face: either both resting on top of the head,
    // or both held up beside the cheeks (crash-out-cat, pencil-in-mouth
    // pose). Use the face box, when we have one, to tell them apart by
    // height; otherwise fall back to "both hands close together and above
    // the wrists" as a rough "hands near face" signal.
    if (faceIsFresh) {
      const { mouthCenter, faceWidth } = lastFace;
      const nearFace = hands.every(
        (h) => dist(h.palmCenter, mouthCenter) / faceWidth < 2.2
      );
      if (nearFace) {
        const headTopY = mouthCenter.y - faceWidth * 1.1;
        const bothAboveHead = hands.every((h) => h.palmCenter.y < headTopY);
        if (bothAboveHead) {
          return "twoHandsOnHead";
        }
        return "crashOutCat";
      }
    }
  }

  const h = hands[0];

  // 1. fist / punch: everything curled
  if (h.curledCount === 4) {
    return "fist";
  }

  // 2. rockstar / shaka: thumb + pinky out, index/middle/ring curled
  if (h.thumbOut && h.pinkyUp && !h.indexUp && !h.middleUp && !h.ringUp) {
    return "rockstar";
  }

  // 3. shhh / one-finger-up: a single extended index finger is a very
  // specific shape (shhh in particular = fingertip right on the mouth), so
  // it must be checked before the broader hand-covering-face test below -
  // otherwise a shhh pose (finger near the mouth) gets swallowed by the
  // "any hand near the face" check.
  if (h.indexUp && !h.middleUp && !h.ringUp && !h.pinkyUp) {
    if (faceIsFresh) {
      const d = dist(h.indexTip, lastFace.mouthCenter) / lastFace.faceWidth;
      if (d < 0.55) {
        return "shhh";
      }
    }
    return "oneFingerUp";
  }

  // 4. hand covering face: the one hand we see sits roughly where the face
  // last was. Wider tolerance if the face detector has fully lost the face
  // (strong evidence of a real occlusion); tighter if it's still partially
  // tracking through the fingers.
  if (faceIsFresh) {
    const d = dist(h.palmCenter, lastFace.mouthCenter) / lastFace.faceWidth;
    const threshold = lastFaceSeenThisFrame
      ? HAND_COVER_FACE_DIST_FACE_SEEN
      : HAND_COVER_FACE_DIST_FACE_LOST;
    if (d < threshold) {
      return "handCoverFace";
    }
  }

  // 5. open palm held out, not near the face: hand stretched out towards
  // the camera, palm up.
  if (h.curledCount === 0) {
    return "handStretchedOut";
  }

  // hands are up but not making a specific shape - still allow a strong
  // side-eye read to win over an ambiguous hand pose.
  if (faceIsFresh && Math.abs(lastFace.yawDeg) > SIDE_EYE_YAW_DEG) {
    return "sideEyeCat";
  }

  return "default";
}

function pickImage(gesture) {
  const images = GESTURE_MEMES[gesture];
  return images[Math.floor(Math.random() * images.length)];
}

function applyGesture(gesture) {
  if (gesture === currentGesture) return;
  currentGesture = gesture;
  memeImg.src = pickImage(gesture);
}

function loop() {
  const now = performance.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const ts = performance.now();

    const handResult = handLandmarker.detectForVideo(video, ts);
    const faceResult = faceLandmarker.detectForVideo(video, ts);
    updateFace(faceResult);

    const gesture = decideGesture(handResult);
    lastHandResult = handResult;
    lastRawGesture = gesture;

    // debounce: require a gesture to be seen for several consecutive
    // frames before we commit to it, to avoid flicker between frames
    if (gesture === candidateGesture) {
      candidateStreak++;
    } else {
      candidateGesture = gesture;
      candidateStreak = 1;
    }

    if (candidateStreak >= STABLE_FRAMES_REQUIRED) {
      applyGesture(gesture);
    }

    if (gesture !== "default") lastNonDefaultAt = now;
    if (now - lastNonDefaultAt > DEFAULT_FALLBACK_MS && currentGesture !== "default") {
      applyGesture("default");
    }

    fpsFrames++;
    if (now - fpsSince >= 500) {
      fps = (fpsFrames * 1000) / (now - fpsSince);
      fpsFrames = 0;
      fpsSince = now;
    }

    drawOverlay();
    updateDebugHud();
  }
  requestAnimationFrame(loop);
}

function drawOverlay() {
  const W = overlay.width;
  const H = overlay.height;
  overlayCtx.clearRect(0, 0, W, H);
  if (!debugOn) return;

  const dot = (p, r, fill) => {
    overlayCtx.beginPath();
    overlayCtx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
    overlayCtx.fillStyle = fill;
    overlayCtx.fill();
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeStyle = "#000";
    overlayCtx.stroke();
  };

  // hands: skeleton + all 21 points, then big dots on the fingertips
  // (green = extended, red = curled) - exactly what classifyHand() decides.
  for (const lm of (lastHandResult && lastHandResult.landmarks) || []) {
    drawingUtils.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, {
      color: "#ffffffb0",
      lineWidth: Math.max(2, W / 220),
    });
    drawingUtils.drawLandmarks(lm, {
      color: "#000",
      fillColor: "#7cffa0",
      lineWidth: 1,
      radius: 3,
    });
    const h = classifyHand(lm);
    const tips = [
      [8, h.indexUp],
      [12, h.middleUp],
      [16, h.ringUp],
      [20, h.pinkyUp],
      [4, h.thumbOut],
    ];
    for (const [idx, on] of tips) {
      dot(lm[idx], Math.max(6, W / 70), on ? "#00e676" : "#ff5252");
    }
  }

  // face references used by the rules (blue = tracked now, orange = stale)
  const now = performance.now();
  if (lastFace && now - lastFace.t < FACE_STALE_MS) {
    const color = lastFaceSeenThisFrame ? "#4fc3f7" : "#ffb300";
    const m = lastFace.mouthCenter;
    const fw = lastFace.faceWidth;

    // mouth point
    dot(m, Math.max(6, W / 70), color);

    // "shhh" zone: index fingertip closer than 0.55 face widths to the mouth
    overlayCtx.beginPath();
    overlayCtx.ellipse(m.x * W, m.y * H, 0.55 * fw * W, 0.55 * fw * H, 0, 0, Math.PI * 2);
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeStyle = color;
    overlayCtx.setLineDash([6, 6]);
    overlayCtx.stroke();

    // "head top" line: palms above this count as hands on head
    const y = (m.y - fw * 1.1) * H;
    overlayCtx.beginPath();
    overlayCtx.moveTo((m.x - fw) * W, y);
    overlayCtx.lineTo((m.x + fw) * W, y);
    overlayCtx.stroke();
    overlayCtx.setLineDash([]);
  }
}

function updateDebugHud() {
  if (!debugHud) return;
  if (!debugOn) {
    debugHud.textContent = `gesture: ${currentGesture}  (tap = debug)`;
    return;
  }

  const now = performance.now();
  const lines = [];
  lines.push(`gesture: ${currentGesture}`);
  lines.push(`raw: ${lastRawGesture}  streak: ${Math.min(candidateStreak, STABLE_FRAMES_REQUIRED)}/${STABLE_FRAMES_REQUIRED}`);

  const lms = (lastHandResult && lastHandResult.landmarks) || [];
  const faceState = lastFaceSeenThisFrame
    ? "tracked"
    : lastFace && now - lastFace.t < FACE_STALE_MS
    ? "stale"
    : "none";
  lines.push(`fps: ${fps.toFixed(0)}  hands: ${lms.length}  face: ${faceState}`);

  const arrow = (v) => (v ? "▲" : "▼");
  const hands = lms.map(classifyHand);
  hands.forEach((h, i) => {
    lines.push(
      `H${i + 1} I${arrow(h.indexUp)} M${arrow(h.middleUp)} R${arrow(h.ringUp)} P${arrow(h.pinkyUp)} T${arrow(h.thumbOut)} curled:${h.curledCount}`
    );
  });

  if (hands.length === 2) {
    const avgScale = (hands[0].handScale + hands[1].handScale) / 2;
    const gap = dist(hands[0].indexTip, hands[1].indexTip) / avgScale;
    lines.push(`tip gap: ${gap.toFixed(2)} (touch < 1.40)`);
  }

  if (lastFace) {
    lines.push(`mouth open: ${lastFace.mouthOpen.toFixed(3)}  face w: ${lastFace.faceWidth.toFixed(3)}`);
    if (hands.length > 0) {
      const d = dist(hands[0].indexTip, lastFace.mouthCenter) / lastFace.faceWidth;
      lines.push(`H1 tip->mouth: ${d.toFixed(2)} (shhh < 0.55)`);
    }
  }
  lines.push(`yaw: ${lastYawDebug >= 0 ? "+" : ""}${lastYawDebug.toFixed(1)} deg (side-eye thr +/-${SIDE_EYE_YAW_DEG.toFixed(1)})`);
  lines.push("tap = hide debug");
  debugHud.textContent = lines.join("\n");
}

init().catch((err) => console.error(err));
