precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uDisplacement;
uniform float uProgress;
uniform float uAlpha;
uniform float uTime;
uniform float uIntensity;
uniform float uRgbShift;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uTex1Res;
uniform vec2 uTex2Res;

// Cover-fit UV: scale texture to fill screen preserving aspect ratio
vec2 coverUV(vec2 uv, vec2 texRes, vec2 screenRes) {
    float sa = screenRes.x / screenRes.y;
    float ta = texRes.x / texRes.y;
    vec2 r = uv;
    if (sa > ta) {
        r.y = (uv.y - 0.5) * (ta / sa) + 0.5;
    } else {
        r.x = (uv.x - 0.5) * (sa / ta) + 0.5;
    }
    return r;
}

void main() {
    float disp = texture2D(uDisplacement, vUv).r;

    // Each texture gets its own displacement that ramps up then down.
    // Texture 1 (outgoing): distortion grows as it fades out
    // Texture 2 (incoming): distortion shrinks as it fades in
    float dispTex1 = uIntensity * uProgress;          // 0 → peak
    float dispTex2 = uIntensity * (1.0 - uProgress);  // peak → 0

    vec2 mouseOff = (uMouse - 0.5) * 0.01;

    // Displace each texture independently in opposite directions
    vec2 dir1 = vec2(disp * dispTex1);
    vec2 dir2 = vec2((1.0 - disp) * dispTex2);

    vec2 uv1 = coverUV(vUv + dir1 + mouseOff * dispTex1, uTex1Res, uResolution);
    uv1.y = 1.0 - uv1.y;
    vec2 uv2 = coverUV(vUv - dir2 - mouseOff * dispTex2, uTex2Res, uResolution);
    uv2.y = 1.0 - uv2.y;

    // Chromatic aberration — stronger during mid-transition
    float midPeak = 4.0 * uProgress * (1.0 - uProgress);
    float ca = uRgbShift * midPeak;

    vec3 c1 = vec3(
        texture2D(uTexture1, uv1 + vec2(ca, 0.0)).r,
        texture2D(uTexture1, uv1).g,
        texture2D(uTexture1, uv1 - vec2(ca, 0.0)).b
    );

    vec3 c2 = vec3(
        texture2D(uTexture2, uv2 + vec2(ca, 0.0)).r,
        texture2D(uTexture2, uv2).g,
        texture2D(uTexture2, uv2 - vec2(ca, 0.0)).b
    );

    // Crossfade
    vec3 color = mix(c1, c2, uProgress);

    // 50% dark overlay
    color *= 0.5;

    gl_FragColor = vec4(color, uAlpha);
}
