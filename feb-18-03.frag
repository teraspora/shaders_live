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

vec4 img;


#define PI 3.141592653588
#define ss(a, b, t) smoothstep(a, b, t)
#define s(edge, t) step(edge, t)

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
vec2 oo = vec2(0,0);

// ==================================================================
// Some functions adapted from Github - 
// https://github.com/tobspr/GLSL-Color-Spaces/blob/master/ColorSpaces.inc.glsl
// - not tested!

vec3 hue2rgb(float hue) {
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

vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

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

// Helper fns.:
float herm (float x) {
    x = mod(x, 2. * PI);
    x = x * 2. / PI;    // map to range [0., 4.]
    int base = int(floor(x));   // base in [0, 1, 2, 3]
    float t = fract(x);
    float y = 3. * t * t - 2. * t * t * t;
    switch (base) {
        case 0:
            return y;
        case 1:
            return 1. - y;
        case 2:
            return -y;
        case 3:
            return y - 1.;
    }
}

float saw_wave(float val, float amp) {
    return (val - floor(val)) * amp;
}

float sq_wave(float val, float amp) {
    float oe = sign(sin(PI * val));
    return oe * amp / PI;
}
float sinex(float x) {
    // switch(int(mod(floor(u_time / 10.), 5.))) {
    //     case 0:
    //         return 99999999.;//sin(x);
    //     case 1:
    //         return cos(x + u_time / 5.);
    //     case 2:
    //         return pow(sin(x), 1.) / 5. + 0.9 + sin(u_time / 3.);
    //     case 3:
    //         return pow(sin(x), 1.) / 4.  + saw_wave(0.005, x) + 0.3 + herm(u_time / 5.);
    //     case 4:
    //         return (cos(x) + sin(1. - x)) / 2.;
    //     case 5:
    //         return saw_wave(x, 0.5) + sq_wave(x, 3.);
    //     default:
    //         ;    
    // }
    return pow(sin(x), 1.) / 4.  + saw_wave(0.005, x) + 0.3 + herm(u_time / 5.);
}
vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

float arg(vec2 z) {
    return atan(z.y, z.x);
}

vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sin(phi));
}

float minkd(vec2 u, vec2 v, float order) {	// Minkowski distance 
    if (order <= 0.) return 0.;		
	return abs(pow(abs(pow(v.x - u.x, order)) + abs(pow(v.y - u.y, order)), 1. / order)); 
}

float minkl(vec2 u, float order) {	// Minkowski length 
    if (order <= 0.) return 0.;			
	return minkd(oo, u, order); 
}

vec2 polar2Cart(float r, float phi) {
    return vec2(r * cos(phi), r * sinex(phi));
}

vec2 cart2Polar(vec2 xy) {
    return vec2(minkd(oo, xy, 2.), arg(xy));
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar2Cart(1.0, phi)) ;
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

float nsinex(float x) {
	return op(sinex(x)) * 0.5;
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

vec2 boxFold(vec2 z, float fold) {
    return vec2(z.x > fold ? 2. * fold - z.x : (z.x < -fold ? -2. * fold - z.x : z.x),
                z.y > fold ? 2. * fold - z.y : (z.y < -fold ? -2. * fold - z.y : z.y));
}

vec2 ballFold(vec2 z, float r, float bigR) {
    float zAbs = minkd(z, oo, 2.);
    r = abs(r);
    return zAbs < r ? z / (r * r) : (zAbs < abs(bigR)) ?
            z / (zAbs * zAbs)
            : z;
}

// =======================================

// rand generator from 
// https://www.youtube.com/watch?v=l-07BXzNdPw&t=740s
vec2 r22(vec2 p) {
	vec3 a = fract(p.xyx * vec3(923.34, 234.34, 345.65));
	a += dot(a, a - 34.45);
    return fract(vec2(a.x * a.y, a.y * a.z));
}


float f(float x) {
	return sinex(cos(0.2 * u_time * x)) + cos(2. * sinex(0.23 * u_time * x)) - sqrt(0.2 *abs(x) * cos(0.02 * u_time * x));
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
    if ((pp.x > b - 1. && pp.x <= b + 1.) || (pp.x > hr.x - b - 1. && pp.x < hr.x - b + 1.)) col = insetColour;
    if ((pp.y > b - 1. && pp.y <= b + 1.) || (pp.y > hr.y - b - 1. && pp.y < hr.y - b + 1.)) col = insetColour;
    
    // Now put a black border on top:
    col *= step(b, pp.x);
    col *= step(b, pp.y);
    col *= (1. - step(hr.x - b, pp.x));
    col *= (1. - step(hr.y - b, pp.y));
    return col;
    
    }

float shape(vec2 u, float minkOrder, float time, float polygonOrder) {
	
    float r = minkl(u, minkOrder) + 0.9 * sinex(abs(8. * (arg(u))) * polygonOrder * sinex(u_time / time));
    return s(r, 0.5) - s(r, 0.48);    
}



void main(void) {
    float blackThreshold = .8 + (1. * nmouse().y + 0.25); // 1.1; // Best varies; try between 1.0 and 1.3
    float t = u_time / 15.;
    float scale = 1.;   
	float asp = u_resolution.x/u_resolution.y;
    // Normalized pixel coordinates (y from -1 to 1)
    vec2 uv = gl_FragCoord / u_resolution.yy - vec2(asp, 1.) * .5;
    scale /= exp2(nmouse().x * 12. - 2.) / 16.;
    // scale /= exp2(3. * (sin(t / 20.) + 1.) - 2.);
    uv *= scale;
    // uv = abs(uv); // // uv = floor(uv * 800) / 800; // pixellatrion
    uv.y += 0.03 * sin(37. * uv.x);
    float amp = 0.22 * sin(t);
    float freq = 3. + sin(u_time / 16.) * 9.;
    float reach = 0.4 * (1. + sin(t));
    
    //col = crimson;
    //col = vec3(fma(0.5, sin(amp / freq + cos(t)), 1.) , sin(sin(length(uv)) * 8. + reach + cos(t)), cos(dot(uv, uv.yx) * reach + cos(t))); // crimson;
    vec3 col = 0.5 + 0.5*cos(u_time / 3. +uv.xyx+vec3(0,2,4));
    //col *= 1. - step(fma(0.1, -saw_wave(arg(uv) / -2. / PI * floor(mod(t, 9.) + 3.), 2.), 0.1), fma(0.66, sin(t / 2.), length(uv)));
    //float k = fma(0.01, -saw_wave(arg(uv) / -2. / PI * floor(mod(t, 9.) + 3.), 2.), 0.1 * fma(0.66, sin(t / 2.), length(uv)));
    
    // uv = polar(k, arg(uv));
    uv.y += 0.05 * sinex(uv.x * 32.  + uv.y * 55. * sinex(t / 1.));
    uv.x += 0.07 * sinex(uv.y * 17.  + uv.x * 41. * sinex(t / 3.));
    uv.y += 0.03 * sinex(uv.x * 9.  + uv.y * 29. * sinex(t / 5.));
    uv.x += 0.04 * sinex(uv.y * 51.  + uv.x * 17. * sinex(t / 2.));
    uv = rotate(uv, uv.y * 3. + sin(t / 3.) + length(uv));
    uv = rotate(uv, uv.x * 2. + sin(t / 2.) + length(uv));
    
    vec2 pq = uv + vec2(asp, 1.) / 2.;
    pq.x /= asp;
    
    if (true) {
        int i = int(mod(floor(u_time / 6.), 9.));
        switch (i) {
            case 0:
                if (u_tex0Resolution != vec2(0.0)) {
                    img = texture2D(u_tex0, pq);
                }
                ;
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
    }

    col = img.rgb; // mix(col, img.rgb, img.a);
    






    //col *= step(mod(uv.x, 0.1), 0.005) + step(mod(uv.y, 0.1), .008);
    //col *= 1. - step(mod(uv.y, 0.1), 0.01);
    //col = saturate(col);
    col = pow(col, vec3(.454545454545));
    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    col = saturate(col);
    col *= 1.;
    col *= step(0., blackThreshold - length(col));
    gl_FragColor = vec4(col, 1.);
}
