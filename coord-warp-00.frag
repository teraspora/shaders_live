#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;
uniform sampler2D u_tex1;
uniform vec2 u_tex1Resolution;

#define pi 3.1415922653589793234

// Some useful colours:
const vec3 white =      vec3(1.,   1.,   1.  );
const vec3 crimson =      vec3(1.,   0.,   0.4  );
const vec3 yellow =      vec3(1.,   1.,   0.  );
const vec3 black =      vec3(0.,   0.,   0.  );
const vec3 orange = vec3(1.0, 0.4, 0.);
const vec3 cyan = vec3(0., 0.4, 1.0);
const vec3 magenta = vec3(1.0, 0., 1.0);
const vec3 gold = vec3(1.0, 0.84, 0.66);

vec3[] cols = vec3[](white, crimson, yellow, magenta, gold, cyan, orange);
vec3 col;

// ==================================================================
// Some functions adapted from Github - 
// https://github.com/tobspr/GLSL-Color-Spaces/blob/master/ColorSpaces.inc.glsl
// - not tested!

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

// My own functions:

float hue(vec3 col) {
    return rgb2hsl(col).s;
}

vec3 changeHue(vec3 col, float newHue) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.s = newHue;
    return hsl2rgb(colHSL);
}

// My inline library of useful functions:
// =======================================

float arg(vec2 z) {
    return atan(z.y, z.x);
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

float om(float x) {
	return 1. - x;
}

vec3 om(vec3 v) {
	return 1. - v;
}

float op(float x) {
	return 1. + x;
}

float nsin(float x) {
	return op(sin(x)) * 0.5;
}

float ncos(float x) {
	return op(cos(x)) * 0.5;
}

float sqrtp(float x) {
	return sqrt(x < 0. ? -x : x); 
}

float nmmod(float x, float y) {
	float xmn = 2. * mod(x, y) / y;
    return xmn < 1. ? xmn : om(xmn);
}

vec3 omss(float mn, float mx, vec3 val) {
	return om(smoothstep(mn, mx, val));
}

vec2 nmouse() {
	return u_mouse.xy / u_resolution.xy;
}

vec3 invert(vec3 col) {
 	return 1. - clamp(col, 0., 1.);   
}

bool isOdd(float p) {
    return fract(p * 0.5) >= 0.5;
}

float minkd(vec2 u, vec2 v, float order) {	// Minkowski distance order 1
    if (order <= 0.) return 0.;				// i.e. Manhattan distance
	return abs(pow(abs(pow(v.x - u.x, order)) + abs(pow(v.y - u.y, order)), 1. / order)); 
}

float minkl(vec2 v, float order) {	// Minkowski distance order 1
    if (order <= 0.) return 0.;				// i.e. Manhattan distance
	return abs(pow(abs(pow(v.x, order)) + abs(pow(v.y, order)), 1. / order)); 
}

float saw_wave(float val, float amp) {
    return (val - floor(val)) * amp;
}

float sq_wave(float val, float amp) {
    float oe = sign(sin(pi * val));
    return oe * amp / pi;
}

float cog_sq(vec2 v, float amp, float freq, float depth) {
    float lv = length(v);
    float phix = atan(v.y, v.x) * freq / pi;
    float dl = sq_wave(phix, depth);
    float m = step(amp, lv + dl);
    return m;
}   

float cog_saw(vec2 v, float amp, float freq, float depth) {
    float lv = length(v);
    float phix = atan(v.y, v.x) * freq / pi;
    float dl = saw_wave(phix, depth);
    float m = step(amp, lv + dl);
    return m;
}   

// float cog_yes(vec2 v, float amp, float freq, float depth) {
//     float lv = length(v);
//     float phix = atan(v.y, v.x) * freq / pi;
//     float dl = yes(phix, 0.5, 3., depth);
//     float m = step(amp, lv + dl);
//     return m;
// }   

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

void main(void) {
    bool centreTexture = true;
    bool outerTexture = true;
    float scale =  0.1 + 12. * nmouse().x;

    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float asp = u_resolution.x / u_resolution.y;
    uv.x *= asp;
    uv -= vec2(asp, 1.) / 2.;
    uv /= scale;
    // =======================================================================
    float t = u_time * 2.;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    // MUTABLE PARAMETERS:
    float blackThreshold = 1.1 + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    uv *= vec2(0.5 + nsin(uv.y * t / 32.) * 0.4, 0.4 + nsin(uv.x * t / 32.) * 1.2);
    uv = rotate(uv, sign(uv.x) * t / 5.);

    col = crimson * step(length(uv), 0.8);
    col *= step(cog_sq(uv, 9.6 * nsin (t / 3.), 6. * nsin (t / 2.), 4. * nsin (t / 4.)), length(uv) * (1. + nsin(t)));
    if (outerTexture) {
        if ( u_tex0Resolution != vec2(0.0) ){
            float imgAspect = u_tex0Resolution.x / u_tex0Resolution.y;
            vec4 img = 2. * texture2D(u_tex0, uv * vec2(1., imgAspect) * 0.5);
            col = mix(12. * col, img.rgb, img.a);
        }
    }
    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 

    col *= step(0., blackThreshold - length(col));
    // col = black;   
    vec2 st = uv + vec2(asp, 1.) / 2.;
    st.x /= asp;
    
    if (centreTexture) {
        if (u_tex1Resolution != vec2(0.0) && col == black) {
            st += vec2(0.25 * sin(abs(st.y) * t / 97.), 0.25 * sin(abs(st.x) * t / 28.));
            vec4 img = texture2D(u_tex1, st);
            col = img.rgb;
            col *= step(0., blackThreshold - length(col));
        }
    }
    col *= step(0., blackThreshold - length(col));

    col = saturate(col);
    gl_FragColor = vec4(col.rgb,1.0);
}