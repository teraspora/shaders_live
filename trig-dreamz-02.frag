/*

Trig Dreamz 02
By John Lynch
February 2019

*/

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

#define PI 3.14159265
#define PHI 1.6180339887 
#define SQ2 1.4142135623

// Gold Noise ©2015 dcerisano@standard3d.com
float gold_noise(in vec2 coord, in float seed) {
    return fract(tan(distance(coord * (seed + PHI), vec2(PHI, PI))) * SQ2);
}

vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sin(phi));
}

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar(1.0, phi)) ;
}

float iden(float x) {
    return x;
}

vec2 nmouse() {
    return u_mouse.xy / u_resolution.xy;
}

// Some functions adapted from Github - 
// https://github.com/tobspr/GLSL-Color-Spaces/blob/master/ColorSpaces.inc.glsl

vec3 hue2rgb(float hue)
{
    float R = abs(hue * 6. - 3.) - 1.;
    float G = 2. - abs(hue * 6. - 2.);
    float B = 2. - abs(hue * 6. - 4.);
    return clamp(vec3(R,G,B), 0., 1.);
}

// Converts a value from linear RGB to HCV (Hue, Chroma, Value)
vec3 rgb2hcv(vec3 rgb) {
    // Based on work by Sam Hocevar and Emil Persson
    vec4 P = (rgb.g < rgb.b) ? vec4(rgb.bg, -1.0, 2.0/3.0) : vec4(rgb.gb, 0.0, -1.0/3.0);
    vec4 Q = (rgb.r < P.x) ? vec4(P.xyw, rgb.r) : vec4(rgb.r, P.yzx);
    float C = Q.x - min(Q.w, Q.y);
    float H = abs((Q.w - Q.y) / (6. * C + 1.e-10) + Q.z);
    return vec3(H, C, Q.x);
}

// Converts from HSL to linear RGB
vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb = hue2rgb(hsl.x);
    float C = (1. - abs(2. * hsl.z - 1.)) * hsl.y;
    return (rgb - 0.5) * C + hsl.z;
}

// Converts from linear rgb to HSL
vec3 rgb2hsl(vec3 rgb) {
    vec3 HCV = rgb2hcv(rgb);
    float L = HCV.z - HCV.y * 0.5;
    float S = HCV.y / (1. - abs(L * 2. - 1.) + 1.e-10);
    return vec3(HCV.x, S, L);
}

// Useful functions:


// Colour fns.:
float hue(vec3 col) {
    return rgb2hsl(col).s;
}

vec3 changeHue(vec3 col, float newHue) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.s = newHue;
    return hsl2rgb(colHSL);
}
	
vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

// Helper fns.:
float om(float x) {		// one minus x
    return 1. - x;
}

vec3 om(vec3 v) {		// one minus v
    return 1. - v;
}

float op(float x) {		// one plus x 
    return 1. + x;
}

// Normalised trig fns.:
float nsin(float x) {
    return op(sin(x)) * 0.5;
}

float ncos(float x) {
    return op(cos(x)) * 0.5;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

void main(void) {
    // MUTABLE PARAMETERS:
    float blackThreshold = 0.8 + (nmouse().y + 0.25); // 1.1; // Best varies; try between 1.0 and 1.3
    
    // ==================================================================
    
    float t = (48. + u_time) * 32. * (nsin(u_time / 64.) + 0.5);
    float scale =  0.3 + 256. * nmouse().x + 0.5 * nsin(t / 32.);
    float asp = u_resolution.x / u_resolution.y;
    vec2 uv = gl_FragCoord.xy /u_resolution.yy - vec2(asp, 1.) * .5;
    float uvl = length(uv);		// save to use later framing viewport
    vec2 st = uv;
    uv = rotate(uv, t / 2048. * sign(mod(u_time, 128.) - 64.));
    float rotationSense1 = 1.  + 0.1 *sin(length(uv));
    float rotationSense2 = -1. - 0.1 *sin(length(uv));uv = abs(uv) / scale;
    uv += vec2(0.002 * sin(abs(uv.y) * t / 8.), 0.003 * sin(abs(uv.x) * t / 12.));
    uv = rotate(uv, t / 256. * rotationSense1 * rotationSense2);
    uv.y += 0.32 * sin(uv.x * 8. * cos(t / 1600.)) + 0.31 * sin(uv.x * 23. * cos(t / 1100.));    
    uv.x += 0.32 * sin(uv.y * 17. * cos(t / 2900.)) + 0.33 * sin(uv.y * 31. * cos(t / 1900.));    
    
    uv.y += 0.31 * sin(uv.x * 53. * cos(t / 1700.)) + 0.325 * sin(uv.x * 41. * cos(t / 4700.));    
    uv.x += 0.31 * sin(uv.y * 71. * sin(t / 2600.)) + 0.33 * sin(uv.y * 43. * cos(t / 6100.));    
    vec3 col = hue2rgb(atan(uv.y, uv.x) / 2. / PI + .5);
	
    col *= step(0., blackThreshold - length(col));
    col = saturate(col);
    float cdelta = mod(t / 64., 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    // Make the frame a disc:
    float k = 0.0 + ncos(t / 400.);
    col = step(uvl, k) * col;
    
    if (uvl > k) {
        for (int i = 0; i < 5; i++) {
      	 	vec2 pos = vec2(asp * (gold_noise(vec2(floor(u_time / 43.), 2. * floor(u_time / 29.)), 1.) - 0.5),
         	                       gold_noise(vec2(floor(u_time / 53.), floor(u_time / 37.)), 2.) - 0.5);
         	col += (0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4))) * step(distance(uv, pos), 0.5);
		}
    }
    col = pow(col, vec3(1./2.2));
    gl_FragColor = vec4(col, 1.);
}