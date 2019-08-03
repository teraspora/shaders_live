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

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;
uniform sampler2D u_tex1;
uniform vec2 u_tex1Resolution;
uniform sampler2D u_tex2;
uniform vec2 u_tex2Resolution;
uniform sampler2D u_tex3;
uniform vec2 u_tex3Resolution;

#define PI 3.141592265
#define HALF_PI 1.57079633
#define TWO_PI 6.283185307

vec4 img;

float asp = gl_FragCoord.x / gl_FragCoord.y;

const float HALF = 0.5;

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
vec2 pq;
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

// from IQ:
vec2 rand2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

vec3 drawBorder(vec3 col, float b, vec3 insetColour, vec3 outsetColour, vec2 pp, vec2 hr, float tileIndex) {
    // `b` is the border width
    // `col` is the input (and output) colour
    // `pp` is (unnormalised) coordinate of pixel
    // `hr` is (unnormalised) resolution
    // Make a border: `b` px solid black; with `insetColour` inset:
    if (tileIndex != -1.) {
        //  any special code for single-pane use goes here    
    }
     // Now put a black border on top:
    col *= step(b, pp.x);
    col *= step(b, pp.y);
    col *= (1. - step(hr.x - b, pp.x));
    col *= (1. - step(hr.y - b, pp.y));
    // Make a line inset:
    if ((pp.x >= b - 2. && pp.x <= b + 2.) || (pp.x > hr.x - b - 1. && pp.x < hr.x - b + 1.)) col = insetColour;
    if ((pp.y >= b - 2. && pp.y <= b + 2.) || (pp.y > hr.y - b - 1. && pp.y < hr.y - b + 1.)) col = insetColour;
    if ((pp.x >= 0. && pp.x <= 8.) || (pp.x >= hr.x - 8. && pp.x <= hr.x)) col = outsetColour;
    if ((pp.y >= 0. && pp.y <= 8.) || (pp.y >= hr.y - 8. && pp.y <= hr.y)) col = outsetColour;
   return col;
}

// MAIN METHOD:

vec3 doStuff(vec2 pixel, vec2 res) {
    // just takes a pixel and a context and outputs a
    // colour to mainImage, which keeps things organised
    // and encapsulated.
            
    // Set this var to the number of tiles across and down:
    tileDim = 1.;
    float numTiles = tileDim * tileDim;
        
    // the output vector, before normalisation,
    // giving the position the program needs to know!-
    vec2 hr = res / tileDim;    // resolution of one tile
    if (tile == 5.) {
        // pixel *= 1.25;   
    }
    vec2 pp = pixel;
    
    // Normalisation and tiling:

    // Make numTiles sub-frames:
    vec2 n = vec2(float(int(pp.x / res.x * tileDim)), float(int(pp.y / res.y * tileDim)));
    tile = numTiles - (n.y * tileDim + n.x);
    tile = numTiles - tile + 1.;
    
    if (tile == 2. || tile == 3.) tile = 5. - tile;
    // start at 1 so we don't lose stuff when multiplying
    toe = fract(tile / 2.) * 4. - 1.; // returns 1. if tile index odd, -1. if even;
    float tile2 = tile * tile;
    t = mod(u_time + 37. * tile, 300.);
    
    // shift back to the first tile if in any other tile:
    pp -= hr * n;
    // normalise to [0, 1[, shift to make unit quad with origin in centre
    uv = pp / hr - 0.5;     // normalise
    // rotate the frame in sync but opposite in sense to the contact rotating
    float level = mod(u_time, 30.);
    uv = rotate(uv, TWO_PI * 0.2 * toe * u_time / 64. * (1. + nsin(tile * 5.)));
    
    scale =  0.1 + 6. * nmouse().x;
    uv /= scale;
    // Main code for the shader goes here:
    // Of the 9 distances from our pt. to the special points of the 3x3 subgrid centred on the block in 
    // which current pixel is to be ffound, get the two smallest.
    // If they are nearly equal, i.e our pt. is equidistant from its two nearest neighbours, then we're on
    // aboundary, so draw it black (having previously coloured based on min. distances):
    // if (tile == 5.) {
    //     hr *= 1.25;
    //     uv *= 12.25;   
    // }
    
    

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
            vec2 rpos = rand2(idCurrent + tile);
            rpos = 0.5 + 0.5 * sin(t + 64. * rpos);
            apos = idCurrent + rpos;
            dist = measure(uvx, apos, 2., 1);   // alt distance possibilities; if 4th param = 0 
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
    // if (d1 < 0.1) col = cols[int(mod(id.x + 2. * id.y, 7.))];

    // ===============================================================================================
    vec2 st = uv + 0.5;
    if (tileDim == 1.) {
        tile = 1. + 2. * floor(nmouse().x * 2.) + floor(nmouse().y * 2.);
     
    }
    bool centreTexture = true;
    if (centreTexture && tileDim == 3. && tile == 5.) {
        pq = abs(uv) + vec2(asp, 1.) / 2.;
        pq.x /= asp;
        pq += vec2(0.02 * sin(abs(pq.y) * t / 2.), 0.03 * sin(abs(pq.x) * t / 3.));
        switch (int(mod(floor(u_time / 120.), 4.))) {
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
        }
        col = img.rgb;
    }
    
    // Border code:    
    // ===============================================================================================
    
    float borderWidth = 3.;
    vec3 borderInsetLineColour = white;
    vec3 borderOutsetLineColour = white;
    
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
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    
    float borderWidth = 2.;
    vec3 borderInsetLineColour = black;
    vec3 borderOutsetLineColour = black;
    vec3 col = doStuff(gl_FragCoord.xy, u_resolution.xy);
    col *= step(0., blackThreshold - length(col));
    
    col = saturate(col);
    float cdelta = mod(t / 2., tile * 7.) / (tile * 7.);
    col = changeHue(col, fract(hue(col) + toe * cdelta));     
    if (tileDim == 1.) col = drawBorder(col, borderWidth, borderInsetLineColour, borderOutsetLineColour, gl_FragCoord.xy, u_resolution.xy, -1.);
    // finally return the colour:
    // col = pow(col, vec3(1./2.2));
    gl_FragColor = vec4(col, 1.0);        
}    