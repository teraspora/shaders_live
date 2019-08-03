/*

Voronoi Shading, another approach, single pass
By John Lynch
February 2019

*/

#ifdef GL_ES
precision mediump float;
#endif
float TWO_PI = 6.28318530716;
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

#define PI 3.141592265
#define HALF_PI 1.57079633
#define TWO_PI 6.283185307

vec4 img;
float t;    
vec2 uv;
float asp = u_resolution.x / u_resolution.y;

const vec3 white =      vec3(1.,   1.,   1.  );
const vec3 black =      vec3(0.,   0.,   0.  );
const vec3 cyan =       vec3(0.0,  1.,   0.84);
const vec3 magenta =    vec3(1.0,  0.,   1.0 );
const vec3 blue =       vec3(0.0,  0.6,  0.84);
const vec3 gold =       vec3(0.89, 0.84, 0.66);
const vec3 orange =     vec3(1.0,  0.2,  0.0 );
const vec3 yellow =     vec3(1.0,  0.9,  0.0 );
const vec3 dark_blue =  vec3(0.0,  0.02, 0.38);
const vec3 crimson =    vec3(0.76, 0.0,  0.42);
const vec3 green =      vec3(0.1,  0.5,  0.25);
const vec3 rich_blue =  vec3(0.0,  0.55, 1.0 );
    
vec3[] cols = vec3[](gold, cyan, rich_blue, crimson, blue, orange, yellow, dark_blue, magenta, green);
int cl = cols.length();
vec3 col;

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

vec3 invert(vec3 col) {
    return 1. - clamp(col, 0., 1.);   
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

float iden(float x) {
    return x;
}

vec2 nmouse() {
    return u_mouse.xy / u_resolution.xy;
}

float minkd(vec2 u, vec2 v, float order) {  // Minkowski distance order 1
    if (order <= 0.) return 0.;             // i.e. Manhattan distance
    return abs(pow(abs(pow(v.x - u.x, order)) + abs(pow(v.y - u.y, order)), 1. / order)); 
}

float minkl(vec2 v, float order) {  // Minkowski distance order 1
    if (order <= 0.) return 0.;             // i.e. Manhattan distance
    return abs(pow(abs(pow(v.x, order)) + abs(pow(v.y, order)), 1. / order)); 
}

float measure(vec2 u, vec2 v, float order, int alt) {  // Minkowski distance 
    if (alt == 0) return minkd(u, v, order);
    else return 0.5 * abs(minkd(u, v, 1.) + minkd(u, v, 2.)); 
}

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

vec2 ffract(vec2 v) {
    return vec2(v.x >= 0. ? fract(v.x) : 1. - fract(v.x), v.y >= 0. ? fract(v.y) : 1. - fract(v.y));
}

float saw_wave(float val, float amp) {
    return (val - floor(val)) * amp;
}

float sq_wave(float val, float amp) {
    float oe = sign(sin(PI * val));
    return oe * amp / PI;
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

// MAIN METHOD:
vec3 doStuff(vec2 pixel, vec2 res) {
    // just takes a pixel and a context and outputs a
    // colour to mainImage, which keeps things organised
    // and encapsulated.
    float t = u_time * 4.; // * 4.; //0.25;
    float scale =  0.1 + 6. * nmouse().x;
    uv = gl_FragCoord.xy / u_resolution.xy;
    uv.x *= asp;
    uv -= vec2(asp, 1.) / 2.;
    uv /= scale;

    // Main code for the shader goes here:
    // ===================================
    // uv = rotate(uv, TWO_PI * 0.2* u_time / 48.);
    // uv.y += 0.02 * sin(uv.x * 8. * cos(t / 16.)) + 0.01 * sin(uv.x * 23. * cos(t / 11.));    
    // uv.x += 0.02 * sin(uv.y * 17. * cos(t / 29.)) + 0.03 * sin(uv.y * 31. * cos(t / 19.));    
    
    // uv.y += 0.01 * sin(uv.x * 53. * cos(t / 17.)) + 0.025 * sin(uv.x * 41. * cos(t / 47.));    
    // uv.x += 0.01 * sin(uv.y * 71. * sin(t / 26.)) + 0.03 * sin(uv.y * 43. * cos(t / 61.));    
    
    // uv.y *= (sin(t / 8.) + 2. + uv.x * 4.) / 10. + 0.9;
    // uv.x *= (sin(t / 5.) + 2. + uv.y * 7.) / 9. + 0.9;

    // uv.y *= (cos(t / 81.) + 2. + uv.x * 14.) / 6. + 0.9;
    // uv.x *= (sin(t / 51.) + 2. + uv.y * 7.) / 12. + 0.95;
    // uv = abs(rotate(uv, t / 16. * sign(uv.x)));
    uv = abs(uv);
    vec2 st = uv;
    float m;
    col = orange;
    // float r = length(st) - 0.04 * (1.2 * sin(arg(st) * 11.) +  2.3 * cos(arg(st) * 3.) +  1.7 * sin(arg(st) * 5.)) * sin(t / 5.);
    // st = polar(r, arg(st));
    // col *= step(length(st), 0.6);

    // float r = length(st) - 0.04 * sin(arg(st) * 16.);
    // st = polar(r, arg(st));
    // col *= step(length(st), 0.4);
    float r; // = length(st) - 0.1 * (1. + sin(t / 8)) * sin(arg(st) * iden(12. * sin(t / 32. + 1.)));
    // st = polar(r, arg(st));
    // col *= 1. - step(length(st), 0.4) + step(length(st), 0.385);

    st = rotate(uv, PI / 2.);
    float tm = mod(u_time, 30.);
    if (tm <= 10.) {
        st = rotate(st, TWO_PI / 2.5 * tm);
    }
    r = length(st) - 0.1 * (1. + sin(t / 8)) * sin(arg(st) * iden(7. * sin(t / 15. + 1.)));
    st = polar(r, arg(st));
    col *= 1. - step(length(st), 0.4) - step(length(st), 0.385);

    st = rotate(uv, PI / 3.);
    r = length(st) - 0.1 * (1. + sin(t / 8)) * sin(arg(st) * iden(5. * sin(t / 7. + 1.)));
    st = polar(r, arg(st));
    col *= 1. - step(length(st), 0.4) - step(length(st), 0.385);
    // col = om(col);


    vec2 pq = st + vec2(asp, 1.) / 2.;
    pq.x /= asp;
    int i = int(mod(floor(u_time / 30.), 9.));   // change to stop/start all  textures
    switch (i) {
        case 0:
            if (u_tex0Resolution != vec2(0.0)) {
                img = texture2D(u_tex0, pq);
            }
            break;
        case 1:
            if (u_tex1Resolution != vec2(0.0)) {
                img = texture2D(u_tex1, pq);
            }
            break;
        case 2:
            if (u_tex2Resolution != vec2(0.0)) {
                img = texture2D(u_tex2, pq);
            }
            break;
        case 3:
            if (u_tex3Resolution != vec2(0.0)) {
                img = texture2D(u_tex3, pq);
            }
            break;
        case 4:
            if (u_tex4Resolution != vec2(0.0)) {
                img = texture2D(u_tex4, pq);
            }
            break;
        case 5:
            if (u_tex5Resolution != vec2(0.0)) {
                img = texture2D(u_tex5, pq);
            }
            break;
        case 6:
            if (u_tex6Resolution != vec2(0.0)) {
                img = texture2D(u_tex6, pq);
            }
            break;
        case 7:
            if (u_tex7Resolution != vec2(0.0)) {
                img = texture2D(u_tex7, pq);
            }
            break;
        case 8:
            if (u_tex8Resolution != vec2(0.0)) {
                img = texture2D(u_tex8, pq);
            }
            break;
        default:
            ;
    }
    if (col != black) col += img.rgb;

    // Non-texture code:
    
    if (false) {
        vec2 st = uv;
        float m;
        // m = cog_saw(st, 0.4, 12., 0.21);
        // col = vec3(m);
        // st = uv + vec2(0.6, 0.5);
        // st = rotate(st, -t);    
        // m = cog_saw(st, 0.3, 7., 0.31);
        // col *= vec3(m);

        // st = uv + vec2(-0.6, -0.5);
        // st = rotate(st, -t / 2.);    
        st = rotate(st, -t / 5.);    
        m = cog_saw(st, 0.3, 8., 0.3);
        col *= vec3(m);


        // st = uv + vec2(-0.6, 0.5);
        st = rotate(st, t / 4.);    
        m = cog_sq(st, 0.4, 12., 0.66);
        col *= vec3(m);


        // st = uv + vec2(0.6, -0.5);
        // st = rotate(st, t / 2.5);    
        // m = cog_sq(st, 0.4, 12., 0.36);
        // col *= vec3(m);
    }
// ================================================================================
    // col *= step(length(st) - 0.05 * sin(arg(st) * 16.), 0.4);
    








    return col;
}   // END doStuff()

void main(void) {    
    // MUTABLE PARAMETERS:
    float blackThreshold = 0.5 + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    
    vec3 col = doStuff(gl_FragCoord.xy, u_resolution.xy);
    
    col *= step(0., blackThreshold - length(col));
    
    col = saturate(col);
    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    gl_FragColor = vec4(col.grb, 1.0);        
}    