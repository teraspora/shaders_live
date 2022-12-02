/*

Voronoi Shading, another approach, single pass
By John Lynch
February 2019

*/

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

vec4 img;

#define PI 3.1415922653589793234
#define PHI 1.6180339887 
#define SQ2 1.4142135623


const float HALF = 0.5;
const float HALF_PI = 1.5707963267948966;
const float TWO_PI = 6.283185307;

// Gold Noise ©2015 dcerisano@standard3d.com
float gold_noise(in vec2 coord, in float seed) {
    return fract(tan(distance(coord * (seed + PHI), vec2(PHI, PI))) * SQ2);
}

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
float tileIndex;
float t;
float tile;
float toe;
float scale;
vec2 uv;
float tileDim;

vec3 getCol(float nf) {
    return cols[int(mod(nf, float(cl)))];
}

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

float modc(vec2 z) {
    return length(z);
}

float arg(vec2 z) {
    return atan(z.y, z.x);
}

vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sin(phi));
}

vec2 prod(vec2 z, vec2 w) {
    return vec2(z.x * w.x - z.y * w.y, z.x * w.y + z.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return prod(v, polar(1.0, phi)) ;
}

vec2 sqd(vec2 z) {
    return prod(z, z);
}

vec2 f0(vec2 z, vec2 w) {
    return sqd(z) + w;
}

vec2 f216(vec2 z, vec2 w) {
    return sqd(polar(sin(z.x)  * cos(z.y) * PI, arg(z))) + w;
}

vec2 f261(vec2 z, vec2 w) {
    return sqd(polar(sin(z.x)  * cos(z.y) * PI + abs(z.x) - abs(z.y), arg(z))) + w;
}

// highp vec2 f216ex(vec2 z, vec2 w) {
//    return f216(f216(f216(z, w), z - w), (z + w) / 2. * sin(u_time / 4.));
// }

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

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 nmouse() {
    return u_mouse.xy / u_resolution.xy;
}

float minkd(vec2 u, vec2 v, float order) {  // Minkowski distance
    if (order <= 0.) return 0.;
    return abs(pow(abs(pow(v.x - u.x, order)) + abs(pow(v.y - u.y, order)), 1. / order)); 
}

float minkl(vec2 v, float order) {  // Minkowski length
    if (order <= 0.) return 0.;
    return abs(pow(abs(pow(v.x, order)) + abs(pow(v.y, order)), 1. / order)); 
}

float measure(vec2 u, vec2 v, float order, int alt) {  // Minkowski distance or...
    if (alt == 0) return minkd(u, v, order);
    // else do something weird!
    else return 0.5 * abs(minkd(u, v, 1.) + minkd(u, v, 2.)); 
}

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

vec2 ffract(vec2 v) {
    // flavour of fract() to handle negative numbers 
    return vec2(v.x >= 0. ? fract(v.x) : 1. - fract(v.x), v.y >= 0. ? fract(v.y) : 1. - fract(v.y));
}

vec2 f216_261(vec2 z, vec2 w) {
    return f216(f261(z, w), f0(z, w + sin(u_time /8.)));
}

// from IQ:
// vec2 rand2( vec2 p ) {
//    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
// }

vec3 drawBorder(vec3 col, float b, vec3 insetColour, vec3 outsetColour, vec2 pp, vec2 hr, float tileIndex) {
    // `b` is the border width
    // `col` is the input (and output) colour
    // `pp` is (unnormalised) coordinate of pixel
    // `hr` is (unnormalised) resolution
    // Make a border: `b` px solid black; with `insetColour` inset:
    if (tileIndex != -1.) {
        //  any special code for single-pane use goes here    
    }
     // Now put a black border on top (now with crinellations):
    col *= step(b + 6. * nsin((pp.y + u_time * 20.) / 2.), pp.x);
    col *= step(b + 6. * nsin((pp.x - u_time * 20.) / 2.), pp.y);
    col *= (1. - step(hr.x - b - 6. * nsin((pp.y - u_time * 20.) / 2.), pp.x));
    col *= (1. - step(hr.y - b - 6. * nsin((pp.x + u_time * 20.) / 2.), pp.y));
    // Make a line inset:
    if ((pp.x >= b - 2. && pp.x <= b + 2.) || (pp.x > hr.x - b - 1. && pp.x < hr.x - b + 1.)) col = insetColour;
    if ((pp.y >= b - 2. && pp.y <= b + 2.) || (pp.y > hr.y - b - 1. && pp.y < hr.y - b + 1.)) col = insetColour;
    if ((pp.x >= 0. && pp.x <= 1.) || (pp.x >= hr.x - 1. && pp.x <= hr.x)) col = outsetColour;
    if ((pp.y >= 0. && pp.y <= 1.) || (pp.y >= hr.y - 1. && pp.y <= hr.y)) col = outsetColour;
   return col;
}

// MAIN METHOD:

vec3 doStuff(vec2 pixel, vec2 res) {
    // just takes a pixel and a context and outputs a
    // colour to mainImage, which keeps things organised
    // and encapsulated.
        
    // Set this var to the number of tiles across and down:
    tileDim = 2.;
    float numTiles = tileDim * tileDim;
        
    // the output vector, before normalisation,
    // giving the position the program needs to know!-
    vec2 pp = pixel;
    vec2 hr = res / tileDim;    // resolution of one tile   

    // Normalisation and tiling:

    // Make numTiles sub-frames:
    vec2 n = vec2(float(int(pp.x / res.x * tileDim)), float(int(pp.y / res.y * tileDim)));
    tile = numTiles - (n.y * tileDim + n.x);
    tile = numTiles - tile + 1.;
    if (tile == 2. || tile == 3.) tile = 5. - tile;
    toe = fract(tile / 2.) * 4. - 1.; // returns 1. if tile index odd, -1. if even;
    float tile2 = tile * tile;
    t = mod(u_time + 37. * tile, 300.);
    
    // shift back to the first tile if in any other tile:
    pp.x -= hr.x * n.x;
    pp.y -= hr.y * n.y;
    // normalise to [0, 1[, shift to make unit quad with origin in centre
    uv = pp / hr - 0.5;     // normalise
    
    uv = abs(uv);
    
    // rotate the frame
    float level = mod(u_time, 30.);
    uv = rotate(uv, TWO_PI * 0.2 * toe * u_time / 16. * (1. + nsin(tile * 5.)));
    
    // uv = sqd(uv) + sin(sqd(uv.yx)) * 0.1;
    // uv = sqd(uv) + sin(sqd(uv.yx)) * 0.1;
    uv = f216_261(uv.yx, uv + 4. * cos(u_time / 32.));
    uv = f216_261(uv, uv.yx - 2. * sin(u_time / 16.));
    
    scale =  12.; // 0.1 + 6. * nmouse().x;
    uv /= scale;
    
    // Main code for the shader goes here:
    // Of the 9 distances from our pt. to the special points of the 3x3 subgrid centred on the block in 
    // which current pixel is to be found, get the two smallest.
    // If they are nearly equal, i.e our pt. is equidistant from its two nearest neighbours, then we're on
    // aboundary, so draw it black (having previously coloured based on min. distances):
    float grid = tile + 2.;
    vec2 uvx = uv * grid;
    vec2 id = floor(uvx);
    vec2 pq = ffract(uvx);
    vec2 apos;
    float dist;
    float d1 = 9998.;   // some big numbers for initial minima
    float d2 = 9999.;
    vec2 idNearest;
    for (float j = id.y - 1.; j <= id.y + 1.; j++) {
        for (float i = id.x - 1.; i <= id.x + 1.; i++) {
            vec2 idCurrent = vec2(i, j);
            // vec2 rpos = rand2(idCurrent + tile);
            vec2 rpos = vec2(gold_noise(idCurrent, tile),
                             gold_noise(idCurrent.yx, 1. / tile));
            rpos = 0.5 + 0.5 * sin(t + 64. * rpos);
            apos = idCurrent + rpos;
            dist = measure(uvx, apos, 2., 1);
            if (dist < d1) {
                d2 = d1;
                d1 = dist;
                idNearest = idCurrent;
            }
            else if (dist < d2) {
                d2 = dist;
            }
        }
    }
    vec2 nidn = idNearest + grid / 2.0;
    col = getCol(nidn.x + grid * nidn.y);
    col.rb *= pow(d2 - d1, 0.25);
    col.g *= d2 * d2 - d1 * d1;
    
    col *= smoothstep(0.0, 0.05, d2 - d1);
    vec2 st = uv + 0.5;
    
    // Border code:  
    
    float borderWidth = 2.;
    vec3 borderInsetLineColour = black;
    vec3 borderOutsetLineColour = black;
        
    col = drawBorder(col, borderWidth, borderInsetLineColour, borderOutsetLineColour, pp, hr, tile);

    // finally return the colour to caller(mainImage()):     
    return col; 
}   // END doStuff()

void main(void) {
    float asp = u_resolution.x / u_resolution.y;
    bool centreTexture = false;
    bool outerTexture = true;
    // MUTABLE PARAMETERS:
    float blackThreshold = 0.5 + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3 
    float borderWidth = 8.;
    vec3 borderInsetLineColour = black;
    vec3 borderOutsetLineColour = black;
    vec3 col = doStuff(gl_FragCoord, u_resolution.xy);
    col *= step(0., blackThreshold - length(col));
    
    col = saturate(col);
    
    float cdelta = mod(t / 2., tile * 7.) / (tile * 7.);
    col = changeHue(col, fract(hue(col) + toe * cdelta));     
    if (tileDim == 1.) col = drawBorder(col, borderWidth, borderInsetLineColour, borderOutsetLineColour, gl_FragCoord, u_resolution.xy, -1.);
    // finally return the colour:
    gl_FragColor = vec4(col.grb, 1.0);        
}    