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
//#define f fragCoord.xy
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

// Converts a value from linear RGB to HCV (Hue, Chroma, Value)
vec3 rgb2hcv(vec3 rgb) {
    // Based on work by Sam Hocevar and Emil Persson
    vec4 P = (rgb.g < rgb.b) ? vec4(rgb.bg, -1.0, 2.0/3.0) : vec4(rgb.gb, 0.0, -1.0/3.0);
    vec4 Q = (rgb.r < P.x) ? vec4(P.xyw, rgb.r) : vec4(rgb.r, P.yzx);
    float C = Q.x - min(Q.w, Q.y);
    float H = abs((Q.w - Q.y) / (6. * C + 1.e-10) + Q.z);
    return vec3(H, C, Q.x);
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


float f(float x) {
	return sin(cos(0.2 * u_time * x)) + cos(2. * sin(0.23 * u_time * x)) - sqrt(0.2 *abs(x) * cos(0.02 * u_time * x));
}

void main(void) {
    float scale = exp2(nmouse().x * 6.) / 16.; // 0.3 + 256. * nmouse().x + 0.5 * nsin(t / 32.);
    float blackThreshold = 1. + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float t = u_time;
    float asp = u_resolution.x/u_resolution.y;
    // Normalized pixel coordinates (y from 0 to 1)
    vec2 uv = (gl_FragCoord/u_resolution.y - vec2(0.5 * asp, 0.5)) / scale;
	uv = rotate(uv, PI * 0.5);
    
    uv.y = abs(uv.y);
    float c = mod(t, 128.) - 104.;
    float a = 5.;
    float b = 8.;
    uv.x += 0.1 * cos(a * uv.y + b * uv.x);
    // col = crimson;
    

    
    float d = 1.0;
    col *= step(uv.y, f(uv.x)) - step(uv.y + d, f(uv.x));
    if (col != black && mod(length(uv), 0.1) > 0.05) {
        col = invert(col);
        col.g *= nsin(t / 6.);
    }
    col.r *= nsin(u_time * 0.015625);    
        
    vec2 pq = rotate(uv, c * PI / 12.);
    if (length(col) > 1. && col != black) {
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
        col = mix(col, img.rgb, img.a);;
    }
    
    if (col == black) {
        col = 0.2 * nsin(u_time * 0.03125) * sin(u_time * 0.425 + length(uv) + vec3(0.,2.,4.));
    	}
    
    // Border code:    
    // ============    
    // float borderWidth = 6.;
    // vec3 borderInsetLineColour = orange;
 	// col = drawBorder(col, borderWidth, borderInsetLineColour, gl_FragCoord, u_resolution.xy, -1.);
    col.g -= nsin(t + length(uv));
    col.b += 0.5 * smoothstep(0., 1., col.r + col.b);
    
    if (rgb2hcv(col).z < 0.1) col = 0.5 + 0.5 * cos(t + uv.xyx + vec3(27, 49, 81));
    col *= step(0., blackThreshold - length(col));
    
    // Output to screen
    gl_FragColor = vec4(col.brg, 1.);
}