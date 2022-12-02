#ifdef GL_ES
precision mediump float;
#endif

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

#define PI 3.141592265
#define HALF_PI 1.5707963267948966
#define TWO_PI 6.283185307

float a = 1.9;

vec3 black = vec3(0.);
vec3 white = vec3(1.);
vec3 colour1 = vec3(.9, .3, .2);
vec3 colour2 = vec3(.0, .7, .8);
vec3 colour3 = vec3(.8, .5, .1);
vec3 colour4 = vec3(.8, .3, .7);

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

// Normalised trig fns.:
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

vec2 trt(vec2 v, vec2 offset, float phi) {
    return rotate(v - offset, phi) + offset;
}

float sec(float theta) {
    return 1. / cos(theta);
}

float iden(float x) {
    return x;
}

vec3 makeBlob(vec2 v, vec2 offset, float edge, vec3 col1, vec3 col2, float time) {
    vec3 blob;
    float dist = distance(v, offset);
    if (dist < edge) {
        v = trt(v, offset, PI / 4. + time);
        blob = col1 + step(edge, dist) - step(edge - .02, dist);
        blob += col2;
        blob += 1. - step(edge * .7 - .1, dist) - step(edge * .7 - .1 - .09, dist);
        

        // if (dist < edge * .8) {
        //     blob *= colour2 * step(dist, edge * .7 - .1);
        //     blob *= step(dist, edge * .8 + .2);
        // }            
    }
    return blob;
}
    
    void main(void) {
    float t = nsin(u_time / 183.) * 200.; //   550;//
    float phi = t;

    float scale = exp2(nmouse().x * 6.) / 4.; // 0.3 + 256. * nmouse().x + 0.5 * nsin(t / 32.);

    float blackThreshold = 0. + (6. * nmouse().y + 0.25); // 1.1; // Best varies; try between 1.0 and 1.3
    vec3 col;
    vec2 asp = vec2(u_resolution.x / u_resolution.y, 1.);
    vec2 uv = gl_FragCoord.xy / u_resolution.yy - asp * .5;
    float amp = 0.04; // * sin(t);
    float freq = 5.;
    float freqx = floor(3. + 32. * nsin(t / 24.)); // + mod(floor(u_time / 16.), 9.);
    // float reach = 0.4 * nsin(t);
    
    // Normalized pixel coordinates (from -.5 to .5 on the y)
    // scale *= 1. / length(offset);
    uv /= scale;

    float stage = mod(u_time, 32.);
    float nstage;
    if (stage > 20. && stage < 28.) {
            nstage = (stage - 24.) * HALF_PI * 2.;
            uv.y /= (1. + sin(nstage) * 0.4);
    }
    if (stage > 24. && stage < 28.) {
            nstage = (stage - 24.) * HALF_PI / 2.;
            uv.x /= (1. + sin(stage) * 0.6);    
    }

    float uvy = uv.y;
    col = mix(vec3(.2, .9, .6), vec3(.9, .3, .2), nsin(pow(length(uv), exp2(16. * nsin(t / 4.) * length(uv))))) / 2.;
    float cdelta = mod(t, 15.) / 15.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    //vec3((uv.x / asp.x + .5 + nsin(uv.y * 4096.)) / 2., (uv.y + .5 + ncos(uv.x * 30.)) / 2., nsin(length(uv) * 20.));


    vec2 offset = vec2(sin(t) / 2., cos(t) / 2.) * asp * 0.75 * nsin(mod(t / 5., 64.));
    vec2 offset2 = vec2(cos(t), sin(t) / 2.) * asp * 0.6 * nsin(mod(t / 7., 32.));
    vec2 offset3 = vec2(a * sin(phi), a * sin(phi) * cos(phi)) * asp * 0.75 * nsin(mod(t / 5., 64.));     // Gerono lemniscate
    vec2 offset4 = vec2(a * .6 * nsin(t / 14.) * sin(phi), a * .7 * sin(phi) * cos(phi)) * asp * 0.75 * nsin(mod(t / 13., 103.));     // Gerono lemniscate
    vec2 offset5 = vec2(polar(a * sin(2. * phi), phi)) * asp * 0.67 * nsin(mod(t / 8., 240.));     // Quadrifolium
        

    float edge = 0.3 + 0.03 * sin(arg(uv - offset) * freqx)  + 0.03 * sin(arg(uv) * freqx) + 0.05 * sin(t / 5.);
    float edge2 = 0.2 + 0.04 * sin(arg(uv - offset) * (-freqx))  + 0.02 * sin(arg(uv.yx) * -freqx) + 0.05 * sin(t / 11.);
    float edge3 = 0.2 + 0.1 * sin(arg(uv - offset) * freqx)  + 0.03 * sin(arg(uv) * freqx) + 0.05 * sin(t / 5.);
    float edge4 = 0.3 + 0.14 * sin(arg(uv.yx - offset) * freqx)  + 0.03 * sin(arg(uv.yx) * freqx) + 0.04 * sin(t / 3.);
    float edge5 = 0.4 + 0.08 * sin(arg(uv - offset) * 5.)  + 0.03 * sin(arg(uv.yx) * floor(freqx / 2.) + 0.04) * sin(t / 13.);
    

    col += makeBlob(uv, offset, edge, colour1, colour4, t);
    col += makeBlob(uv.yx, offset2, edge2, colour2, colour3, t);
    col += makeBlob(uv.yx, offset3, edge3, colour3, colour1, t);
    col += makeBlob(-uv, offset4 + .5, edge4 - .1, colour4, colour2, t);
    col += makeBlob(-uv, offset4 - .4, edge4 - .2, 1. - colour4, 1. - colour3, t);
    col += makeBlob(uv, offset5, edge5, 1. - colour3, colour4, t);
    
    float swoopSpeed = 24.;
    offset = vec2(a * sin(phi), a * sin(phi) * cos(phi)) * asp * 0.75 * nsin(mod(t / swoopSpeed, 640.));     // Gerono lemniscate
    float dist = distance(uv, offset);
    if (dist < edge3) {
        uv = trt(uv, offset, PI / 4. + t);
        col += colour1;
        // col = texture2D(u_tex0, uv).rgb;
        if (dist > edge3 - .01) {
            col = 0.;
        }
        if (dist < edge3 * .33) {
            col = colour4;
            if (dist > edge3 * .3 - .01) {
                col = 0.;
            }
        }
            
    }



    vec2 pq = uv + vec2(asp.x, 1.) / 2.;
    


    pq.x /= asp;
    
    

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
    
    col *= 1. - step(0.5, length(uv));
    // col *= step(0.02, fract(uv.x * freq / asp.x));
    // col *= step(0.02, fract(uv.y * freq));
    // 

    cdelta = mod(t, 32.) / 32.;
    col = changeHue(col, fract(hue(col) + cdelta)); 
    col *= 1.;
    col *= step(0., blackThreshold - length(col));
    if (length(col) > 1.25) col = 0.5 + 0.5 * cos(u_time + uv.yxy + vec3(2, 0,4));
    col = saturate(col);
    gl_FragColor = vec4(col,1.0);
}  