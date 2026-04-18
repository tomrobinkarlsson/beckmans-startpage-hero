precision highp float;

varying vec2 vUv;

uniform sampler2D uCurrentTexture;
uniform sampler2D uNextTexture;
uniform sampler2D uDisplacement;
uniform vec2 uResolution;
uniform vec2 uCurrentTextureSize;
uniform vec2 uNextTextureSize;
uniform float uProgress;
uniform float uTime;
uniform float uDisplacementStrength;

vec2 coverUv(vec2 uv, vec2 textureSize, vec2 viewport) {
  float viewportRatio = viewport.x / viewport.y;
  float textureRatio = textureSize.x / textureSize.y;
  vec2 result = uv;
  if (viewportRatio > textureRatio) {
    result.y = (uv.y - 0.5) * (textureRatio / viewportRatio) + 0.5;
  } else {
    result.x = (uv.x - 0.5) * (viewportRatio / textureRatio) + 0.5;
  }
  return result;
}

void main() {
  float progress = smoothstep(0.0, 1.0, uProgress);
  float wave = sin((vUv.y + uTime * 0.08) * 6.28318) * 0.5 + 0.5;
  float disp = texture2D(uDisplacement, vUv + vec2(0.0, uTime * 0.03)).r;

  vec2 direction = normalize(vec2(1.0, 0.18));
  float shapeA = uDisplacementStrength * progress * (0.7 + wave * 0.3);
  float shapeB = uDisplacementStrength * (1.0 - progress) * (0.75 + (1.0 - wave) * 0.25);

  vec2 currentUv = coverUv(vUv + direction * disp * shapeA, uCurrentTextureSize, uResolution);
  vec2 nextUv = coverUv(vUv - direction * (1.0 - disp) * shapeB, uNextTextureSize, uResolution);

  currentUv.y = 1.0 - currentUv.y;
  nextUv.y = 1.0 - nextUv.y;

  vec3 currentColor = texture2D(uCurrentTexture, currentUv).rgb;
  vec3 nextColor = texture2D(uNextTexture, nextUv).rgb;
  vec3 color = mix(currentColor, nextColor, progress);

  gl_FragColor = vec4(color, 1.0);
}
