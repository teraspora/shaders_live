#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265
#define PHI 1.6180339887 
#define SQ2 1.4142135623

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;
uniform sampler2D u_tex1;
uniform vec2 u_tex1Resolution;
uniform sampler2D u_tex2;
uniform vec2 u_tex2Resolution;
uniform sampler2D u_tex3;
uniform vec2 u_tex3Resolution;
uniform sampler2D u_tex4;
uniform vec2 u_tex4Resolution;
uniform sampler2D u_tex5;
uniform vec2 u_tex5Resolution;
uniform sampler2D u_tex6;
uniform vec2 u_tex6Resolution;
uniform sampler2D u_tex7;
uniform vec2 u_tex7Resolution;
uniform sampler2D u_tex8;
uniform vec2 u_tex8Resolution;

#define pi 3.1415922653589793234
vec4 img;

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

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

// My inline library of useful functions:
// =======================================

vec3 om(vec3 v) {       // one minus v
    return 1. - v;
}

float op(float x) {     // one plus x 
    return 1. + x;
}

float herm (float x) {
    x = 2. * x / PI;
    float base = floor(mod(x, 2.));
    x = fract(x);
    float y = 3. * x * x - 2. * x * x * x;
    return base == 0. ? y : -y;
}

float hermg (float x) {
    x = 2. * x / PI;
    float base = floor(mod(x, 2.));
    x = fract(x);
    float y = 3. * x * x - 2. * x * x * x;
    return base == 0. ? y : 1. - y;
}

float hosg(float x) {
    return hermg(x + PI / 2.);
}

float nhermg (float x) {
    return op(hermg(x)) * 0.5;
}

float nhosg (float x) {
    return op(hosg(x)) * 0.5;
}

float hos (float x) {
    return herm(x + PI / 2.);
}

float arg(vec2 z) {
    return atan(z.y, z.x);
}

vec2 polar(float r, float phi) {
    return vec2(r *cos(phi), r * sin(phi));
}

float nsin(float x) {
    return op(sin(x)) * 0.5;
}

float ncos(float x) {
    return op(cos(x)) * 0.5;
}

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar(1.0, phi)) ;
}

float nherm(float x) {
	return op(herm(x)) * 0.5;
}

float nhos(float x) {
	return op(hos(x)) * 0.5;
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
    float oe = sign(herm(pi * val));
    return oe * amp / pi;
}

void main(void) {
    float asp = u_resolution.x / u_resolution.y;
    float t = u_time * .8;
    float scale =  0.1 + 12. * nmouse().x; //  / numPoints / u_resolution.x;
    vec2 uv = gl_FragCoord.xy / u_resolution.yy - vec2(asp, 1.) * .5;
    float uvl = length(uv);     // save to use later framing viewport
    float uva = arg(uv);
    uv /= scale;
    uv = abs(uv);
    uv.y += .25 * hermg(t / 3.);
    uv.x += .25 * hermg(t / 5.);
    vec3 col = vec3(1);;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    // MUTABLE PARAMETERS:
    float blackThreshold = 0.1 + 24. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *herm(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *herm(length(uv));
    // ==================================================================
    
    uv = rotate(uv, t / 8.);
    uv = rotate(uv, minkl(uv, floor(mod(t / 7.9, 2.) + 1.)) < 0.3 ? -t / 4. : t / 7.);
    col += 0.5 * cos(t + uv.xyx + vec3(1.,2.,4.));
    if (minkl(uv, floor(mod(t / 3.9, 2.) + 1.)) < 0.3) col = 1. - col;
    uv.y += 0.4 * hermg(uv.x * 8. + t);
    uv.x += 0.9 * hermg(uv.y * ncos(t / 3.) * t);
    col *= 1. - vec3(length(uv), abs(uv.x) + abs(uv.y), minkl(uv, 1.));
    
    vec2 pq = uv + vec2(asp, 1.) / 2.;
    pq.x /= asp;
    
    int i = int(mod(floor(u_time / 32.), 18.));     // alternate images and cycles with no image
    switch (i) {
        case 0:
            if (u_tex0Resolution != vec2(0.0)) {
                img = texture2D(u_tex0, pq);
            }
            break;
        case 2:
            if (u_tex1Resolution != vec2(0.0)) {
                img = texture2D(u_tex1, pq);
            }
            break;
        case 4:
            if (u_tex2Resolution != vec2(0.0)) {
                img = texture2D(u_tex2, pq);
            }
            break;
        case 6:
            if (u_tex3Resolution != vec2(0.0)) {
                img = texture2D(u_tex3, pq);
            }
            break;
        case 8:
            if (u_tex4Resolution != vec2(0.0)) {
                img = texture2D(u_tex4, pq);
            }
            break;
        case 10:
            if (u_tex5Resolution != vec2(0.0)) {
                img = texture2D(u_tex5, pq);
            }
            break;
        case 12:
            if (u_tex6Resolution != vec2(0.0)) {
                img = texture2D(u_tex6, pq);
            }
            break;
        case 14:
            if (u_tex7Resolution != vec2(0.0)) {
                img = texture2D(u_tex7, pq);
            }
            break;
        case 16:
            if (u_tex8Resolution != vec2(0.0)) {
                img = texture2D(u_tex8, pq);
            }
            break;
        default:
            ;
    }
    col = mix(col, img.rgb, nherm(t / 256.));

    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 

    col *= step(0., blackThreshold - length(col));
    col = pow(col, vec3(.25));
    col = saturate(col);    
    gl_FragColor = vec4(col.rgb,1.0);
}