#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

#define ss(a, b, t) smoothstep(a, b, t)
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

float minkd(vec2 u, vec2 v, float order) {
    if (order <= 0.) return 0.;
    return abs(pow(abs(pow(v.x - u.x, order))
       + abs(pow(v.y - u.y, order)), 1. / order));
} 

// from https://www.youtube.com/watch?v=3CycKKJiwis
float dist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float k = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    return length(pa - ba * k);
}

float n21(vec2 p) {
	p = fract(p * vec2(3378.92001, 744.7716));
    p += dot(p, p + 68.997401);    
    return fract(p.x * p.y);
}

vec2 n22(vec2 p) {
	float n = n21(p);    
    return vec2(n, n21(p + n));
}

vec2 getPos(vec2 id, vec2 off) {
    vec2 n = n22(id + off) * u_time * 2.;
    return 0.4 * (vec2(cos(n.x), sin(n.y)) + 2.5 * off);
}

float line(vec2 p, vec2 a, vec2 b) {
	float d = dist(p, a, b);
    float m = ss(.03, .01, d );
    float d2 = minkd(a, b, 2.);
    m *= ss(1.0, 0.9, abs(d2 - 0.75));
    return m;
}

float layer (vec2 uv) {
	float m = 0.;
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);
    // draw random points; getPos() makes them move
    // vec2 p = getPos(id);
    // float d = distance(p, gv);
    // float m = ss(0.1, 0.05, d);
    
    vec2 p[9];
    int i = 0;
    for (float y = -1.; y <= 1.; y++) {
    	for (float x = -1.; x <= 1.; x++) {
     		 p[i++] = getPos(id, vec2(x, y));  	
        }
    }
    
    // for (int j = -1; j <= 1; j++) {
    // 	for (int i = -1; i <= 1; i++) {
    //  		 p[int(3 * i + j + 4)] = getPos(id, vec2(i, j));  	
    //     }
    // }
    float t = (1000. - u_time) * 100.;
    for (int i = 0; i < 9; i++) {
     	m += line(gv, p[4], p[i]);
        vec2 j = (p[i] - gv) * 4.;
        float sparkle = -2. /dot(j, j);
        m+= sparkle / 16. * (1. + cos(t * 10. + fract(p[i].x) * 10.)) / 2.;
        
    }
    
    m += line(gv, p[1], p[3]);
    m += line(gv, p[7], p[5]);
    m += line(gv, p[7], p[3]);
    m += line(gv, p[1], p[5]);
    return m;
}

vec2 rotate(vec2 v, float phi) {
    float s = sin(phi);
    float c = cos(phi);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

vec2 nmouse() {
    return u_mouse.xy / u_resolution.xy;
}

void main(void) {
    float scale =  0.1 + 12. * nmouse().x;

    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float asp = u_resolution.x / u_resolution.y;
    uv.x *= asp;
    uv -= vec2(asp, 1.) / 2.;
    uv /= scale;
    // =======================================================================
    float t = u_time * 0.25;
    vec2 mouse = 2. * u_mouse.xy / u_resolution.xy - 1.;
    mouse.x *= u_resolution.x / u_resolution.y;
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //uv = abs(uv);
    // MUTABLE PARAMETERS:
    float blackThreshold = 1. + 2. * nmouse().y; // 1.1; // Best between 1.0 and 1.3
    float rotationSense1 = 1.;  //  + 0.1 *sin(length(uv));
    float rotationSense2 = -1.; //  - 0.1 *sin(length(uv));
    // ==================================================================
    
    //float d = dist(uv, vec2(0), vec2(.3));
    float m = 0.; // ss(.1, .05, d);
    
    //m = layer(uv * 8.);
    uv *= 2.4;
    float dir = t;
    mouse = rotate(mouse, dir * 6.); 
    for (float i = 0.; i < 1.; i += 1./4.) {
        uv = rotate(uv, dir * 6.);
    	dir = - dir;
        float z = fract(i + t);
        float size = mix(10., 0.5, z);
        float fade = ss(0., 0.95, z);
        m += layer(uv * size + i * 24. + 2. * mouse * dir / t) * fade;
    }
    
    // colours from Martijn:
    // factors make range 0.2-1.0:
    vec3 base = sin(t * 40. * vec3(.7345, .8456, .9567)) * .4 + .6; 
    
    
    
    
    
    
    col = vec3(m) * base;
    
    col += uv.y / 4.;
    
    // ==========================================================
    // Previous colouring methods: 
    //if (gv.x > 0.48 || gv.y > 0.48) col.b = 1.;
    
    // col.g = clamp(dot(uv , sin(u_time / 28. * id)), 0., 1.);
    // col.r = clamp(dot(uv * 6., cos(u_time / 8. * id)), 0., 1.);
    
    //col *= (1. + cos(u_time / 16.+uv.yyx+vec3(0,2,4))) / 2.;
    
    vec2 st = uv + vec2(asp, 1.) / 2.;
    st.x /= asp;
    
    if (u_tex0Resolution != vec2(0.0) ) {
        vec4 img = texture2D(u_tex0, st);
        col = mix(col,img.rgb,img.a);
    }

    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 


    col *= step(0., blackThreshold - length(col));
        
    gl_FragColor = vec4(col.rgb,1.0);
}