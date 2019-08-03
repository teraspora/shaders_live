#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

#define PI 3.1415922653589793234

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
    float oe = sign(sin(PI * val));
    return oe * amp / PI;
}

float yes(float x, float a, float b, float c) {
	return sin(exp(a * x) - b * sin(c * x));
}

vec2 yes(vec2 v, float a, float b, float c) {
	return vec2(yes(v.x, a, b, c), yes(v.y, a, b, c));
}

vec3 yes(vec3 v, float a, float b, float c) {
	return vec3(yes(v.x, a, b, c), yes(v.y, a, b, c), yes(v.z, a, b, c));
}

float afsin(float amp, float freq, float x) {
	return amp * sin(freq * x);
}

float afcos(float amp, float freq, float x) {
	return amp * cos(freq * x);
}

float nafsin(float amp, float freq, float x) {
	float a = afsin(amp, freq, 0.);
    float b = afsin(amp, freq, 1.);
    float afs = afsin(amp, freq, x);
    if (b == a || (a == 0. && b == 1.)) return afs;
    return (afs - a) / (b - a);
}

float nafcos(float amp, float freq, float x) {
	float a = afcos(amp, freq, 0.);
    float b = afcos(amp, freq, 1.);
    float afc = afcos(amp, freq, x);
    if (b == a || (a == 0. && b == 1.)) return afc;
    return (afc - a) / (b - a);
}

vec2 nafcos(float amp, float freq, vec2 v) {
    return vec2(nafcos(amp, freq, v.x), nafcos(amp, freq, v.y));
}




float cog_sq(vec2 v, float amp, float freq, float depth) {
    float lv = length(v);
    float phix = atan(v.y, v.x) * freq / PI;
    float dl = sq_wave(phix, depth);
    float m = step(amp, lv + dl);
    return m;
}   

float cog_saw(vec2 v, float amp, float freq, float depth) {
    float lv = length(v);
    float phix = atan(v.y, v.x) * freq / PI;
    float dl = saw_wave(phix, depth);
    float m = step(amp, lv + dl);
    return m;
}   

float cog_yes(vec2 v, float amp, float freq, float depth) {
    float lv = length(v);
    float phix = atan(v.y, v.x) * freq / PI;
    float dl = yes(phix, 0.5, 3., depth);
    float m = step(amp, lv + dl);
    return m;
}   


void main(void) {
    float scale =  0.1 + 12. * nmouse().x; 
    // float scale =  2.;
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float asp = u_resolution.x / u_resolution.y;
    uv.x *= asp;
    uv -= vec2(asp, 1.) / 2.;
    // uv /= scale;
// =======================================================================
    uv /= scale;
    float t = u_time * 4.25;
    vec2 mouse = 2. * u_mouse.xy / u_resolution.xy - 1.;
    mouse.x *= u_resolution.x / u_resolution.y;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //uv = abs(uv);
    // MUTABLE PARAMETERS:
    float blackThreshold = 12. + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    
    // vec2 st = rotate(uv, t * 0.1) + mouse;
    // float m;

    // // col = 0.5 + 0.5 * cos(t / 16. + uv.xyx + vec3(1.,2.,4.));

    
    // if (false) {
    //     m = cog_saw(st, 2.0, 128. * sin(t / 256.), 2.);
    //     col = vec3(m);
    //     st = uv + vec2(0.6, 0.5);
    //     st = rotate(st, -t);    
    //     m = cog_saw(st, 0.3, 7., 0.31);
    //     col *= vec3(m);

    //     st = uv + vec2(-0.6, -0.5);
    //     st = rotate(st, -t / 2.);    
    //     m = cog_saw(st, 0.2, 6., 0.11);
    //     col *= vec3(m);


    //     st = uv + vec2(-0.6, 0.5);
    //     st = rotate(st, t / 4.);    
    //     m = cog_sq(st, 0.3, 4., 0.41);
    //     col *= vec3(m);


    //     st = uv + vec2(0.6, -0.5);
    //     st = rotate(st, t / 2.5);    
    //     m = cog_sq(st, 0.4, 12., 0.36);
    //     col *= vec3(m);
    // }
    
    // st = abs(uv); // + vec2(0.9, 0.7);
    // st = rotate(st, t / 5.5);    
    // m = cog_yes(st, nafcos(0.5, 5., st.x), nafcos(0.7, 3., sin(u_time / 3.)), nafcos(0.2, 11., st.y));
    // col *= vec3(m);
    
    //col.g = step(1., minkl(uv, 2.0));

    // col *= 1. - vec3(length(uv), 0.2, minkl(uv, 2.));
    
    // uv = rotate(uv, mod((uv.x + uv.y) * 32. * sin(t / 256.), 2. * PI));
    // ========================================================================

    // uv.x *= sin(uv.x * 24. * cos(t)) - 2. * cos(3. * t) * uv.y;
    // uv.x *= cos(uv.y * 17. * cos(t / 3.)) - 3. * cos(5. * t) * uv.x;

    // col = step(length(uv), 0.6) * crimson;
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // col += 0.5 * cos(t / 3. + uv.xyx + vec3(1.,2.,4.));
    // col = vec3(1.);
    col = 0.5 + 0.5 * cos(t / 3. + uv.xyx + vec3(0., 2., 4.));
    uv.y += 0.1 * nsin(t * 2.) * sin(uv.x * 36. * sin(t / 2.));
    // uv.x += 0.3 * nsin(t * 3.) * sin(uv.y * 11. * sin(t / 5.));
    // uv = rotate(uv, 4.5 * mod((uv.x + uv.y) * 3. * sin(t / 23.), 2. * PI));
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    








    vec2 st = uv + vec2(asp, 1.) / 2.;
    st.x /= asp;
    // vec2 st = (uv * scale + vec2(asp, 1.) / 2.) / scale;

    if (u_tex0Resolution != vec2(0.0) ) {
        vec4 img = texture2D(u_tex0, st);
        col = mix(col,img.rgb,img.a);
    }

    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 


    // col *= step(0., blackThreshold - length(col));
        
    gl_FragColor = vec4(col.rgb,1.0);
}