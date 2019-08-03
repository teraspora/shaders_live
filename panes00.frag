// Pane/ border experimentation - a gl_Fragment shader in OpenGL, built on shadertoy.com;
// Author: John Lynch (teraspora);
// Date: 26 SEP 2018.

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
uniform sampler2D u_tex2;
uniform vec2 u_tex2Resolution;
uniform sampler2D u_tex3;
uniform vec2 u_tex3Resolution;

vec4 img;

#define PI 3.1415922653589793234

float asp = gl_FragCoord.x / gl_FragCoord.y;

const float HALF = 0.5;
const float HALF_PI = 1.5707963267948966;
// const float PI = 3.141592654;
const float TWO_PI = 6.283185307;

const vec3 white =      vec3(1.,   1.,   1.  );
const vec3 black =      vec3(0.,   0.,   0.  );
const vec3 cyan =       vec3(0.0,  1.,   0.84);
const vec3 magenta =    vec3(1.0,  0.,   1.0 );
const vec3 blue =       vec3(0.0,  0.6,  0.84);
const vec3 gold =       vec3(1.0,  0.84, 0.66);
const vec3 orange =     vec3(1.0,  0.2,  0.0 );
const vec3 yellow =     vec3(1.0,  1.0,  0.0 );
const vec3 dark_blue =  vec3(0.0,  0.05, 0.15);
const vec3 crimson =    vec3(0.76, 0.0,  0.42);
    
vec3[] cols = vec3[](magenta, cyan, crimson, blue, orange, yellow);
int cl = cols.length();
vec3 col;
float tileIndex;

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

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

vec3 drawBorder(vec3 col, float b, vec3 insetColour, vec2 pp, vec2 hr, float tileIndex) {
    // `b` is the border width
    // `col` is the input (and output) colour
    // `pp` is (unnormalised) coordinate of pixel
    // `hr` is (unnormalised) resolution
    // Make a border: `b` px solid black; with `insetColour` inset:
    if (tileIndex != -1.) {
        //  any special code for single-pane use goes here    
    }
    // Make a line inset:
    if ((pp.x > b - 1. && pp.x <= b + 2.) || (pp.x > hr.x - b - 1. && pp.x < hr.x - b + 2.)) col = insetColour;
    if ((pp.y > b - 1. && pp.y <= b + 2.) || (pp.y > hr.y - b - 1. && pp.y < hr.y - b + 2.)) col = insetColour;
    
    // Now put a black border on top:
    col *= step(b, pp.x);
    col *= step(b, pp.y);
    col *= (1. - step(hr.x - b, pp.x));
    col *= (1. - step(hr.y - b, pp.y));
    return col;
}

// MAIN METHOD:

vec3 doStuff(vec2 pixel, vec2 res) {
    // just takes a pixel and a context and outputs a
    // colour to mainImage, which keeps things organised
    // and encapsulated.
        
    // Set this var to the number of tiles across and down:
    float tileDim = 1.;
    float numTiles = tileDim * tileDim;
        
    // the output vector, before normalisation,
    // giving the position the program needs to know!-
    vec2 pp = pixel;
    vec2 hr = res / tileDim;    // resolution of one tile
    
    
    
    // ===============================================================
    
    // Normalisation and tiling:
    // ========================
    
    // Make numTiles sub-frames:
    vec2 n = vec2(float(int(pixel.x / res.x * tileDim)), float(int(pixel.y / res.y * tileDim)));
    float tile = numTiles - (n.y * tileDim + n.x); 
    if (tile == 2. || tile == 3.) tile = 5. - tile;
    // start at 1 so we don't lose stuff when multiplying
    float toe = fract(tile / 2.) * 4. - 1.; // returns 1. if tile index odd, -1. if even;
    float tile2 = tile * tile;
    float t = u_time + 37 * tile;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    // shift back to the first tile if in any other tile:
    pp.x -= hr.x * n.x;
    pp.y -= hr.y * n.y;
    // normalise to [0, 1[, shift to make unit quad with origin in centre
    vec2 uv = pp / hr - 0.5;     // normalise
        
    // Main code for the shader goes here:
    // ===============================================================================================
    uv = rotate(uv, PI / 32. * u_time * toe);
    float temp = uv.y;
    uv.y += 0.05 * sin(uv.x * 64. * sin(t / 5.));
    uv.x += 0.05 * sin(temp * 71. * cos(t / 3.));
    vec2 scale = vec2(sin(t / 5.) * 0.75 + 0.75, sin(t / 8.) * 0.75 + 0.75);
    uv *= scale;
    
    








    // ===============================================================================================
    vec2 st = uv + 0.5; // + vec2(asp, 1.) / 2.;
    // q.x /= asp;
    if (tileDim == 1.) {
        tile = 1. + 2. * floor(nmouse().x * 2.) + floor(nmouse().y * 2.);
     
    }
    switch (tile - 1.) {
        case 0:
            if (u_tex0Resolution != vec2(0.0)) {
                img = texture2D(u_tex0, st);
            }
            break;
        case 1:
            if (u_tex1Resolution != vec2(0.0)) {
                img = texture2D(u_tex1, st);
            }
            break;
        case 2:
            if (u_tex2Resolution != vec2(0.0)) {
                img = texture2D(u_tex2, st);
            }
            break;
        case 3:
            if (u_tex3Resolution != vec2(0.0)) {
                img = texture2D(u_tex3, st);
            }
            break;
    }
    col = img.rgb;

    float cdelta = mod(u_time, tile * 7.) / (tile * 7.);
    col = changeHue(col, fract(hue(col) + cdelta)); 
    
    // Border code:    
    // ===============================================================================================
    
    float borderWidth = 3.;
    vec3 borderInsetLineColour = white;
    
    col = drawBorder(col, borderWidth, borderInsetLineColour, pp, hr, tile);
    // finally return the colour to caller(mainImage()):     
    return col;
}   // END doStuff()
    // ===============================================================================

    

void main(void) {    
    float borderWidth = 6.;
    vec3 borderInsetLineColour = white;
    vec3 col = doStuff(gl_FragCoord, u_resolution.xy);
    if (tileIndex == -1) col = drawBorder(col, borderWidth, borderInsetLineColour, gl_FragCoord, u_resolution.xy, -1.);
    
    col = saturate(col);

    // finally return the colour:
    gl_FragColor = vec4(col, 1.0);        
}    