#include <common_frag>

uniform vec4 betaR;
varying vec2 v_Uv;


const float Rg = 6360.0;
const float Rt = 6420.0;
const float RL = 6421.0;


//Half heights for the atmosphere air density (HR) and particle density (HM)
//This is the height in km that half the particles are found below
const  float HR = 8.0;
const  float HM = 1.2;

#define TRANSMITTANCE_NON_LINEAR
// #define INSCATTER_NON_LINEAR
// ---------------------------------------------------------------------------- 
// NUMERICAL INTEGRATION PARAMETERS 
// ---------------------------------------------------------------------------- 
// default Transmittance sample is 500, less then 250 sample will fit in SM 3.0 for dx9,
#define TRANSMITTANCE_INTEGRAL_SAMPLES 100
//default Inscatter sample is 50
#define INSCATTER_INTEGRAL_SAMPLES 25
const  vec3 betaMSca = vec3 (4e-3, 4e-3, 4e-3);
const  vec3 betaMEx = betaMSca / 0.9;



// ---------------------------------------------------------------------------- 
// UTILITY FUNCTIONS 
// ---------------------------------------------------------------------------- 

// nearest intersection of ray r,mu with ground or top atmosphere boundary 
// mu=cos(ray zenith angle at ray origin) 
float Limit(float r, float mu) 
{ 
    float dout = -r * mu + sqrt(r * r * (mu * mu - 1.0) + RL * RL); 
    float delta2 = r * r * (mu * mu - 1.0) + Rg * Rg; 
    
    if (delta2 >= 0.0) 
    { 
        float din = -r * mu - sqrt(delta2); 
        if (din >= 0.0) 
        { 
            dout = min(dout, din); 
        } 
    } 
    
    return dout; 
}


// pixel shader entry point
// ---------------------------------------------------------------------------- 
// TRANSMITTANCE FUNCTIONS 
// ---------------------------------------------------------------------------- 
float OpticalDepth(float H, float r, float mu) 
{ 
    float result = 0.0; 
    float dx = Limit(r, mu) / float(TRANSMITTANCE_INTEGRAL_SAMPLES); 
    float xi = 0.0; 
    float yi = exp(-(r - Rg) / H); 
    
    for (int i = 1; i <= TRANSMITTANCE_INTEGRAL_SAMPLES; ++i) 
    { 
		float i_float = float(i);
        float xj = i_float * dx; 
        float yj = exp(-(sqrt(r * r + xj * xj + 2.0 * xj * r * mu) - Rg) / H); 
        result += (yi + yj) / 2.0 * dx; 
        xi = xj; 
        yi = yj; 
    }
     
    return mu < -sqrt(1.0 - (Rg / r) * (Rg / r)) ? 1e9 : result; 
} 
void GetTransmittanceRMu(vec2 coord, out float r, out float muS) 
{ 
    r = coord.y; 
    muS = coord.x;
#ifdef TRANSMITTANCE_NON_LINEAR 
    r = Rg + (r * r) * (Rt - Rg); 
    muS = -0.15 + tan(1.5 * muS) / tan(1.5) * (1.0 + 0.15); 
#else 
    r = Rg + r * (Rt - Rg); 
    muS = -0.15 + muS * (1.0 + 0.15); 
#endif 
}

void main() {
	 
    float r, muS; 
    GetTransmittanceRMu(v_Uv, r, muS); 

    vec3 depth = betaR.xyz * OpticalDepth(HR, r, muS) + betaMEx * OpticalDepth(HM, r, muS); 
	gl_FragColor = vec4(exp(-depth), 1.0); // Eq (5)

}