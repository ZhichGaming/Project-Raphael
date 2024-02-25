export const fragmentShader = /* glsl */ `
precision mediump float;
varying vec2 vUv;

uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;

void main() {
    vec4 intensity = vec4(1.0);

    gl_FragColor = (texture2D(baseTexture, vUv) + intensity * texture2D(bloomTexture, vUv));
}
`;

