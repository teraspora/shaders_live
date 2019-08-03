#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.14159265

uniform vec3 u_light;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
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

varying vec4 v_position;
varying vec4 v_color;
varying vec3 v_normal;

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
    
vec3[] cols = vec3[](magenta, cyan, crimson, blue, orange, yellow, dark_blue, gold);
int cl = cols.length();

// Some functions adapted from Github - 
// https://github.com/tobspr/GLSL-Color-Spaces/blob/master/ColorSpaces.inc.glsl

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

// Useful functions:


// Colour fns.:
float hue(vec3 col) {
    return rgb2hsl(col).s;
}

vec3 changeHue(vec3 col, float newHue) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.s = newHue;
    return hsl2rgb(colHSL);
}
    
float lightness(vec3 col) {
    return rgb2hsl(col).b;
}

vec3 changeLightness(vec3 col, float newLightness) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.p = newLightness;
    return hsl2rgb(colHSL);
}
    
vec3 saturate(vec3 col) {
    vec3 colHSL = rgb2hsl(col);
    colHSL.t = 1.0;
    return hsl2rgb(colHSL);    
}

vec2 nmouse() {
    return u_mouse.xy / u_resolution.xy;
}

float om(float x) {     // one minus x
    return 1. - x;
}

vec3 om(vec3 v) {       // one minus v
    return 1. - v;
}

float op(float x) {     // one plus x 
    return 1. + x;
}

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
    switch(int(mod(floor(u_time / 20.), 5.))) {
        case 0:
            return sin(x);
        case 1:
            return pow(sin(x), 3.) / 5. + 2.9 + sin(u_time / 3.);
        case 2:
            return cos(x + u_time / 5.);
        case 3:
            return pow(sin(x), 2.) / 4.  + saw_wave(0.000000001, x) + 1.3 - herm(u_time / 5.);
        case 4:
            return (cos(x) + sin(1. / x)) / 2.;
    }
    return pow(sin(x), 2.) / 5.  + saw_wave(0.000000001, x) + 1.9 + sin(u_time / 5.);
}

// Normalised trig fns.:
float nsinex(float x) {
    return op(sinex(x)) * 0.5;
}

float ncos(float x) {
    return op(cos(x)) * 0.5;
}

float arg(vec2 z) {
    return atan(z.y, z.x);
}

vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sinex(phi));
}

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar(1.0, phi)) ;
}

vec2 ffract(vec2 v) {
    return vec2(v.x >= 0. ? fract(v.x) : 1. - fract(v.x), v.y >= 0. ? fract(v.y) : 1. - fract(v.y));
}

float sing (float x) {
    float base = trunc(mod(x, 2.));
    x = ffract(x);
    float y = sinex(x);
    return base == 0. ? y : 1. - y;
}

float perp(vec2 v) {
    return vec2(-v.y, v.x);
}

float ksinfx(float amp, float freq, float x) {
    return amp * sinex(freq * x);
}

float kcosfx(float amp, float freq, float x) {
    return amp * cos(freq * x);
}

float sinsum(float[] amps, float[] freqs, float x) {
    int len = amps.length();
    if (freqs.length() != len) return 0.;
    float sum = 0.;
    for (int i = 0; i < len; i++) {
        sum += ksinfx(amps[i], freqs[i], x);
    }
    return sum;
}

float cossum(float[] amps, float[] freqs, float x) {
    int len = amps.length();
    if (freqs.length() != len) return 0.;
    float sum = 0.;
    for (int i = 0; i < len; i++) {
        sum += kcosfx(amps[i], freqs[i], x);
    }
    return sum;
}


void main(void) {
    float scale = exp2(nmouse().x * 6.) / 16.; // 0.3 + 256. * nmouse().x + 0.5 * nsinex(t / 32.);
    float blackThreshold = 0. + (6. * nmouse().y + 0.25); // 1.1; // Best varies; try between 1.0 and 1.3
    vec3 col;
    float t = 20. + u_time / 5.; //  mod(u_time, 200.);
    // t /= 3.;
    scale *= 1.; // 0.5 + ncos(t / 43.);
    bool polygon = true; // floor(mod(t / 16., 2.));
    float asp = u_resolution.x / u_resolution.y;
    vec2 st = gl_FragCoord.xy / u_resolution.yy - vec2(asp, 1.) / 2.;

    float[] amps = float[](0.0301 * sinex(t * 7.), 0.0202 * sinex(t * 5.), 0.010033 * sinex(t * 3.), 0.01810014 * sinex(t * 2.));
    float[] freqs = float[](196. + ksinfx(13. * sqrt(length(st)), 9., arg(st)), 5., 28., 41. * (st.x + st.y), 128 * sinex(t / 5.));
    st /= scale;
    st = abs(st);
    st = floor(st * 1e20) / 1e20;
    // st = rotate(st, t / 17.);
    float amp = 0.22 * sinex(t);
    float freq = 3. + mod(floor(u_time / 16.), 9.);
    float reach = 0.4 * nsinex(t);
    float sty = st.y;
    // float hu = 0.8; // rgb2hsl(0.5 + 0.5 * cos(u_time + st.xyx + vec3(fract(st.x), fract(st.y), 4. * fract(length(st * 1911.))))).r;
    // col = hsl2rgb(vec3(0.6, 1., 1.));
    col = white; // 0.5 + 0.5 * cos(u_time / 3. + st.xyx + vec3(fract(st.x), fract(st.y), 4. * fract(length(st * 1911.))));
    st.y += 0.05 * sinex(st.x * 32. * sinex(t / 11.) + t);
    st.x += 0.09 * sinex(sty * 29. * sinex(t / 8.) + 1.3 * t);

// =====================================================================
    // st.y += 0.04 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 3. * cos(t / 800.)) + 0.34 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 23. * cos(t / 900.));    
    // st.x += 0.18 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 17. * cos(t / 2900.)) + 0.03 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 101. * cos(t / 1500.));    
    
    // st.y += 0.51 * cos(mod(max(st.x, st.y), min(st.x, st.y)) * 53. * cos(t / 1300.)) + 0.125 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 51. * cos(t / 3300.));    
    // st.x += 0.26 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 71. * sinex(t / 4600.)) + 0.33 * sinex(mod(max(st.x, st.y), min(st.x, st.y)) * 49. * cos(t / 4200.));    
// ======================================================================
    // if (mod(u_time, 64.) > 48.) {
    //     st = vec2(1. / length(st), arg(st));
    // }
    
    st += vec2(sinsum(amps, freqs, sinex(st.x * 32. * sinex(t / 11.) + t)), cossum(amps, freqs, sinex(sty * 29. * sinex(t / 8.) + 1.3 * t)));

    st = rotate(st.yx, (length(st) + st.x * 3. + st.y * 5. + arg(st)) / sinex(t / 23.));
    st.x *= 2. * nsinex(st.y + t / 3.);
    if (polygon) {
        col = vec3(fract(amp / freq + cos(t / 9.)), fract(sinex(length(st) * 8. + reach + cos(t / 9.))), ncos(dot(st, st.yx) * reach + cos(t / 9.))); // crimson;

        col *= 1. - step(length(st) + amp * sinex((arg(st) + t / 1.) * freq), reach);
        col *= 1. - step(length(st) + amp * sinex((arg(st) - t / 2.) * (freq )), reach * 0.6);
    }
    float k = 1. * (0.2 + sinex(t / 29.)) * (sinex(64. * (st.x + 0.02 * (0.1 + nsinex(t / 23.)) * perp(cos(256. * (0.2 + sinex(t / 11.)) * (st.y))))));
    col *=  step(k, abs(arg(st)) * length(st));

    vec2 pq = st + vec2(asp, 1.) / 2.;
    pq.x /= asp;
    
    if (col == black) {
        int i = int(mod(floor(u_time / 16.), 9.));
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
    }

    col = mix(col, img.rgb, img.a);
    // col *= smoothstep(reach, 10., length(st) + amp * herm((arg(st) + 2.1 * sinex(length(st)) * 0.004 + t / 6.) * freq));
    // col += smoothstep(reach, 10., length(st) + amp * herm((arg(st) + 2.1 * sinex(length(st)) * 0.004 - t / 4.1) * ++freq)) * vec3(0., 0.4, 0.9);
    // col += smoothstep(reach, 10., length(st) + amp * herm((arg(st) + 2.1 * sinex(length(st)) * 0.004 + t / 3.1) * ++freq)) * vec3(0.9, 0.6, 0.3);
    // col += smoothstep(reach, 10., length(st) + amp * herm((arg(st) + 2.1 * sinex(length(st)) * 0.004 - t / 2.1) * ++freq)) * vec3(0.3, 0.8, 0.2);
    // col = pow(col, vec3(.45));
    float cdelta = mod(u_time, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    col *= 1.;
    col *= step(0., blackThreshold - length(col));
    col = saturate(col);
    col.r *= 1. + step(0.5, col.b);
    gl_FragColor = vec4(col.rgb, 1.0);
}

