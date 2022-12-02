// Spearline® logo on Irish/Romanian/Indian flags, waving in the wind!

// TO DO:
// Indian flag Ashoka Chakra ideally needs a linear function for the outer spokes;
// mix() between flags over time is not even (3 != 2^n LOL!);
// Obviate transition artefacts;
// Add Israeli flag!

// John Lynch, 2022.

// Improvements?   Welcome!

#define PI 3.141592653588


vec2 polar(float r, float phi) {
    return vec2(r * cos(phi), r * sin(phi));
}

vec2 times(vec2 v, vec2 w) {
    return vec2(v.x * w.x - v.y * w.y, v.x * w.y + v.y * w.x);
}

vec2 rotate(vec2 v, float phi) {
    return times(v, polar(1.0, phi)) ;
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

vec3 BLACK = vec3(0);
vec3 WHITE = vec3(1);
vec3 IR_GREEN = vec3(0.08627450980392157, 0.6078431372549019, 0.3843137254901961);
vec3 ORANGE = vec3(1, 0.5333333333333333, 0.24313725490196078);
vec3 SP_BLUE = vec3(0, 0.6, 1.0);
vec3 GREY = vec3(0.05529411764705882, 0.07999999999999999, 0.10470588235294118);
vec3 ROM_BLUE = vec3(0.0, 0.16862745098039217, 0.4980392156862745);
vec3 YELLOW = vec3(0.9882352941176471, 0.8196078431372549, 0.08627450980392157);
vec3 RED = vec3(0.807843137254902, 0.06666666666666667, 0.14901960784313725);
vec3 SAFFRON = vec3(1.0, 0.6, 0.2);
vec3 IND_GREEN = vec3(0.07450980392156863, 0.5333333333333333, 0.03137254901960784);
vec3 CHAKRA_BLUE = vec3(0.0, 0.0, 0.5019607843137255);


vec3 IrishFlag(vec2 uv) {
    vec3 col = mix(BLACK, IR_GREEN, smoothstep(-0.870, -0.867, uv.x));
    col = mix(col, WHITE, smoothstep(-0.315, -0.312, uv.x));
    col = mix(col, ORANGE, smoothstep(0.312, 0.315, uv.x));
    col = mix(col, BLACK, smoothstep(0.867, 0.870, uv.x));
    col = mix(BLACK, col, smoothstep(-0.475, -0.472, uv.y));
    col = mix(col, BLACK, smoothstep(0.472, 0.475, uv.y));
    return col;
}

vec3 RomanianFlag(vec2 uv) {
    vec3 col = mix(BLACK, ROM_BLUE, smoothstep(-0.870, -0.867, uv.x));
    col = mix(col, YELLOW, smoothstep(-0.315, -0.312, uv.x));
    col = mix(col, RED, smoothstep(0.312, 0.315, uv.x));
    col = mix(col, BLACK, smoothstep(0.867, 0.870, uv.x));
    col = mix(BLACK, col, smoothstep(-0.475, -0.472, uv.y));
    col = mix(col, BLACK, smoothstep(0.472, 0.475, uv.y));
    return col;
}

vec3 IndianFlag(vec2 uv) {
    vec3 col = mix(BLACK, IND_GREEN, smoothstep(-0.475, -0.472, uv.y));
    col = mix(col, WHITE, smoothstep(-0.175, -0.172, uv.y));
    col = mix(col, SAFFRON, smoothstep(0.172, 0.175, uv.y));
    col = mix(col, BLACK, smoothstep(0.472, 0.475, uv.y));
    col = mix(BLACK, col, smoothstep(-0.870, -0.867, uv.x));
    col = mix(col, BLACK, smoothstep(0.867, 0.870, uv.x));
    // Now need to add Ashoka Chakra with 24 diamond-shaped spokes, a hub, and 24 little bulges inside the rim!
    col = mix(CHAKRA_BLUE, col, smoothstep(0.025, 0.028, length(uv)));
    // Ring
    float radius_big = 0.13;
    float ring_width = 0.017;
    vec3 bkg_col = col;    // we may need a reference to the existing colour in case we change it!
    col = bool(
        step(radius_big, length(uv)) 
        * (1. - step(radius_big + ring_width, length(uv)))
    ) 
    ? CHAKRA_BLUE : col;
    // Inner spokes:
    col = length(uv) > radius_big / 2.0 ? col : mix(CHAKRA_BLUE, col, smoothstep(0., 0.2, mod(arg(uv), PI / 12.)));
    // Outer spokes:
    float radius_less_big = radius_big - 0.01;
    float radius_smaller = radius_big / 2.0;
    float span = radius_less_big - radius_smaller;
    float extent = 1.0 - (length(uv) - radius_smaller) / span;    
    col = length(uv) > radius_big - 0.01  || length(uv) < radius_big / 2.0  ? col : mix(CHAKRA_BLUE, col, (1.0 / extent) * smoothstep(0., 0.18, mod(arg(uv), PI / 12.)));
    // Add 24 little semi-discs inside the ring:
    vec2 sc = polar(0.133, 3. * PI / 24.);
    col = mix(CHAKRA_BLUE, col, smoothstep(0.008, 0.009, distance(polar(length(uv), mod(arg(uv), PI / 12.) + PI / 12.), sc)));
    return col;
}

vec3 Logo(vec3 col, vec2 uv) {
    // Create Spearline logo from 
    // 1. A rectangle and 5 blue discs
    // 2. A grey ring with 3 gaps
    // 3. 3 small grey discs in the gaps
    float x_offset = 0.25;
    float y_offset = 0.1666;
    float delta_x = 0.15;
    float delta_y = 0.12;
    float delta_phi = PI / 16.0;
    float radius_small = 0.125;
    float radius_smaller = radius_small * 0.8;
    float radius_big = 0.25;
    float radius_tiny = 0.03;
    float ring_width = 0.025;
    float radius_bigger = radius_big + ring_width / 2.0;
    float rec_width = 0.13;
    // Grey discs' centres:
    vec2 left = polar(radius_bigger, PI);
    vec2 upper = polar(radius_bigger, PI / 3.0);
    vec2 lower = polar(radius_bigger, -PI / 3.0);
    
    vec3 col_orig = col;
    
    // Move everything down a bit
    uv.y += 0.05;
    
    // Main discs
    col = bool(step(-radius_small, -length(uv + vec2(uv.x - x_offset, uv.y)))) ? SP_BLUE : col;
    col = bool(step(-radius_small, -length(uv + vec2(uv.x + x_offset, uv.y)))) ? SP_BLUE : col;
    // Rectangle
    col = bool(step(-radius_small / 2.0, -abs(uv.y))) && bool(step(-rec_width, -abs(uv.x))) ? SP_BLUE : col;
    // Top discs
    col = bool(step(-radius_small, -length(uv + vec2(uv.x, uv.y - y_offset)))) ? SP_BLUE : col;
    col = bool(step(-radius_smaller, -length(uv + vec2(uv.x + (x_offset + delta_x / 2.0) / 2.0, uv.y - y_offset / 2.0)))) ? SP_BLUE : col;
    col = bool(step(-radius_smaller, -length(uv + vec2(uv.x - (x_offset + delta_x)/ 2.0, uv.y - (y_offset + delta_y) / 2.0)))) ? SP_BLUE : col;
    
    // Move the ring up a bit
    uv.y -= 0.05;
    // Haha, make the grey ring rotate slowly for an interesting effect!
    uv = rotate(uv, PI * iTime / 14.8);
    
    // "Z-index hack" - to ensure we see Ashoka Chakra over blue part of logo when Indian flag visible
    float s = smoothstep(-0.2, 0.2, -cos(iTime / 8.));
    col = mix(col, col_orig, s - 0.2);
    
    // Grey ring
    vec3 bkg_col = col;    // we will need a reference to the existing colour in case we change it!
    float delta = 0.001;
    col = bool(
        smoothstep(radius_big, radius_big + delta, length(uv)) 
        * (1. - smoothstep(radius_big + ring_width, radius_big + ring_width + delta, length(uv)))
        // Cut out chunk on left
        * (1. - smoothstep(PI - delta_phi, PI - delta_phi + delta, abs(arg(uv))))        
    ) 
    ? GREY : col;    
    // Cut out chunks on right
    col = abs(abs(arg(uv)) - PI / 3.0) < delta_phi
        && col == GREY
    ? bkg_col : col;
    // Three grey discs
    col = bool(step(-radius_tiny, -length(uv - left))) ? GREY : col;
    col = bool(step(-radius_tiny, -length(uv - upper))) ? GREY : col;
    col = bool(step(-radius_tiny, -length(uv - lower))) ? GREY : col;
    return col;
}

vec2 Wave(vec2 uv) {
    float time = iTime;
    float t = uv.x * 7. + uv.y * 3. - 2. * time;
    uv.y += sin(t) * .02;
    uv.x += sin(t * 1.6) * .01;
    return uv;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    float time = iTime;
    // float time = 15. * (sin(iTime) + 1.);
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    // Hack to constrain L & R edges without changing smoothstep() args in flag functions:
    uv.x *= 1.01;
    uv = Wave(uv);
    vec3 col = mix(mix(IrishFlag(uv), RomanianFlag(uv), smoothstep(-0.2, 0.2, -cos(time / 4.))), IndianFlag(uv), smoothstep(-0.2, 0.2, -cos(time / 8.)));
    col = Logo(col, uv);
    // Add a little shading:
    float t = uv.x * 7. - 2. * time + uv.y * 3.;
    col *= .95 + cos(t) * cos(t) * 0.1;
    fragColor = vec4(col, 1);  
}



    // EXPERIMENTS
    
    //float d = dot(uv * nsin(iTime / 2.), vec2(0,1));
    //col += d;
    //col = mix(col, vec3(1, 0, 0), smoothstep(0.03, 0.02, length(uv)));
    //uv.y += sin(iTime * 2.) * 0.01;
    //col -= (Wave(uv) - uv).x * (Wave(uv) - uv).y * 100.;
    //col += dot(uv * nsin(iTime / 2.), vec2(0, 0.8));
    

