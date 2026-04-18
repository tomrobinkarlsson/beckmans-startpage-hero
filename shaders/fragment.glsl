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
    // Sample displacement map (grayscale Perlin noise)
    float disp = texture2D(uDisplacement, vUv).r;

    // Displacement strength decreases as transition progresses
    float strength = uIntensity * (1.0 - uProgress);

    // Subtle mouse-driven offset for organic feel
    vec2 mouseOff = (uMouse - 0.5) * 0.015 * strength;

    // Directional warp: mostly horizontal, slight vertical
    vec2 dir = vec2(0.8, 0.2);

    // Offset source UVs in opposite directions for organic cross-warp
    vec2 d1 = vUv + dir * disp * strength + mouseOff;
    vec2 d2 = vUv - dir * (1.0 - disp) * strength - mouseOff;

    // Map displaced UVs to cover-fit texture space, flip Y for correct orientation
    vec2 uv1 = coverUV(d1, uTex1Res, uResolution);
    uv1.y = 1.0 - uv1.y;
    vec2 uv2 = coverUV(d2, uTex2Res, uResolution);
    uv2.y = 1.0 - uv2.y;

    // Chromatic aberration scaled to displacement strength
    float ca = uRgbShift * strength;

    // Sample texture 1 with RGB channel offset
    vec3 c1 = vec3(
        texture2D(uTexture1, uv1 + vec2(ca, 0.0)).r,
        texture2D(uTexture1, uv1).g,
        texture2D(uTexture1, uv1 - vec2(ca, 0.0)).b
    );

    // Sample texture 2 with RGB channel offset
    vec3 c2 = vec3(
        texture2D(uTexture2, uv2 + vec2(ca, 0.0)).r,
        texture2D(uTexture2, uv2).g,
        texture2D(uTexture2, uv2 - vec2(ca, 0.0)).b
    );

    // Crossfade between textures (progress is already GSAP-eased)
    vec3 color = mix(c1, c2, uProgress);

    // 50% dark overlay to match Figma comp
    color *= 0.5;

    gl_FragColor = vec4(color, uAlpha);
}
