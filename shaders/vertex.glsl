attribute vec2 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
    vUv = vec2(uv.x, 1.0 - uv.y);
    gl_Position = vec4(position, 0.0, 1.0);
}
