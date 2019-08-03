#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

#define PI 3.141592653588

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

// =======================================

// rand generator from 
// https://www.youtube.com/watch?v=l-07BXzNdPw&t=740s
vec2 r22(vec2 p) {
	vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
	a += dot(a, a + 34.45);
    return fract(vec2(a.x * a.y, a.y * a.z));
}


float f(float x) {
	return sin(cos(0.2 * u_time * x)) + cos(2. * sin(0.23 * u_time * x)) - sqrt(0.2 *abs(x) * cos(0.02 * u_time * x));
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
    if ((pp.x >= 0 && pp.x <= 4) || (pp.x >= hr.x - 2 && pp.x <= hr.x)) col = crimson;
    if ((pp.y >= 0 && pp.y <= 4) || (pp.y >= hr.y - 2 && pp.y <= hr.y)) col = crimson;
    
    // Now put a black border on top:
    col *= step(b, pp.x);
    col *= step(b, pp.y);
    col *= (1. - step(hr.x - b, pp.x));
    col *= (1. - step(hr.y - b, pp.y));
    return col;
    
    }

void main(void) {
    float scale =  0.1 + 2. * nmouse().x; 
    // float scale =  2.;
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float asp = u_resolution.x / u_resolution.y;
    uv.x *= asp;
    uv -= vec2(asp, 1.) / 2.;
    uv /= scale;
    // =======================================================================
    float t = u_time / 20.; //0.25;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // uv = abs(uv);
    // MUTABLE PARAMETERS:
    float blackThreshold = 3. + nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    
    

    uv += 0.5 * cos(t / 12.) * vec2(cos(uv.x * t), sin(uv.y * t));
    uv.x += 8. * nsin(t / 10.) * ncos(t / 10.) * sin(uv.y);
    uv.y += .04 * ncos(uv.x * t / 3.) * ncos(t / 7.) * sin(4. * uv.y);

    col = vec3(sin(3. * sin(t) * length(uv) * 40.) + sin(t * 6.  + uv.x * 3.));
    col.b *= length(uv);
    col.r *= nsin(abs(length(uv* 100.) + uv.x));
    col.g = ncos(13. * sin(6. *t) * length(uv) * 5.) + cos(t * 0.125  + (uv.x + uv.y * 0.02 * nsin(t)));
    col *= nmouse().y / nmouse().x;
    
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    
    
    
    
    // Border code:    
    // ============    
    float borderWidth = 4.;
    vec3 borderInsetLineColour = orange;
 	col = drawBorder(col.rgg, borderWidth, borderInsetLineColour, gl_FragCoord, u_resolution.xy, -1.);
    
    //col = 0.78 - fract(col * u_time / 256.);

    
    float cdelta = mod(u_time, 8.) / 8.;
    col = changeHue(col, fract(hue(col) + cdelta)); 


    col *= step(0., blackThreshold - length(col));
        
    if (u_tex0Resolution != vec2(0.0) && col == black) {
        vec2 st = uv + vec2(asp, 1.) / 2.;
        st.x /= asp;
        vec4 img = texture2D(u_tex0, st);
        col = img.rgb;
    }

    gl_FragColor = vec4(col.rgb,1.0);
}