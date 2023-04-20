#include <common_frag>
uniform sampler2D _Transmittance;


uniform vec4 betaR;
varying vec2 v_Uv;



const float Rg = 6360.0;
const float Rt = 6420.0;
const float RL = 6421.0;

uniform float RES_R; 		// 3D texture depth
const float RES_MU = 128.; 	// height of the texture
const float RES_MU_S = 32.; // width per table
const float RES_NU = 8.;	// table per texture depth

//Half heights for the atmosphere air density (HR) and particle density (HM)
//This is the height in km that half the particles are found below
const  float HR = 8.0;
const  float HM = 1.2;
// ---------------------------------------------------------------------------- 
// NUMERICAL INTEGRATION PARAMETERS 
// ---------------------------------------------------------------------------- 
// default Transmittance sample is 500, less then 250 sample will fit in SM 3.0 for dx9,
#define TRANSMITTANCE_INTEGRAL_SAMPLES 100
//default Inscatter sample is 50
#define INSCATTER_INTEGRAL_SAMPLES 25
const float epsion= 0.000001;

const  vec3 betaMSca = vec3 (4e-3, 4e-3, 4e-3);
const  vec3 betaMEx = betaMSca / 0.9;

#define TRANSMITTANCE_NON_LINEAR
#define INSCATTER_NON_LINEAR

float modFun(float x, float y) { return x - y * floor(x/y); }
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

//----------------------------------------------------------------------------------------------------

void GetMuMuSNu(vec2 coord, float r, vec4 dhdH, out float mu, out float muS, out float nu) 
{ 
    float x = coord.x * float(RES_MU_S * RES_NU) - 0.5;
    float y = coord.y * float(RES_MU) - 0.5; //coord.y ==>(1.-coord.y)

#ifdef INSCATTER_NON_LINEAR 
    if (y < float(RES_MU) / 2.0) // bottom half
    { 
        float d = 1.0 - y / (float(RES_MU) / 2.0 - 1.0); 
        d = min(max(dhdH.z, d * dhdH.w), dhdH.w * 0.999); 
        mu = (Rg * Rg - r * r - d * d) / (2.0 * r * d); 
        mu = min(mu, -sqrt(1.0 - (Rg / r) * (Rg / r)) - 0.001); 
    } 
    else 
    { 
        float d = (y - float(RES_MU) / 2.0) / (float(RES_MU) / 2.0 - 1.0); 
        d = min(max(dhdH.x, d * dhdH.y), dhdH.y * 0.999); 
        mu = (Rt * Rt - r * r - d * d) / (2.0 * r * d); 
    } 
    muS = modFun(x, float(RES_MU_S)) / (float(RES_MU_S) - 1.0); 
    // paper formula 
    //muS = -(0.6 + log(1.0 - muS * (1.0 -  exp(-3.6)))) / 3.0; 
    // better formula 
    muS = tan((2.0 * muS - 1.0 + 0.26) * 1.1) / tan(1.26 * 1.1); 
    nu = -1.0 + floor(x / float(RES_MU_S)) / (float(RES_NU) - 1.0) * 2.0; 
#else 
    mu = -1.0 + 2.0 * y / (float(RES_MU) - 1.0); 
    muS = modFun(x, float(RES_MU_S)) / (float(RES_MU_S) - 1.0); 
    muS = -0.2 + muS * 1.2; 
    nu = -1.0 + floor(x / float(RES_MU_S)) / (float(RES_NU) - 1.0) * 2.0; 
#endif 
}

// UE4 AtmosphereRendering.cpp
void GetLayer(float layer, out float r, out vec4 dhdH)
{
	// Assign the total depth constant for "RES_R" altitude layer setting.
	const float RES_R_TOTAL = 32.;
    //	float RES_R_TOTAL = RES_R; // original code
	
	r = float(layer) / max((RES_R_TOTAL - 1.0), 1.0);
	r = r * r;
	r = sqrt(Rg * Rg + r * (Rt * Rt - Rg * Rg)) + (abs(layer - 0.)<epsion ? 0.01 : (abs(layer - RES_R_TOTAL + 1. )<epsion? -0.001 : 0.0));
	
	float dmin = Rt - r;
	float dmax = sqrt(r * r - Rg * Rg) + sqrt(Rt * Rt - Rg * Rg);
	float dminp = r - Rg;
	float dmaxp = sqrt(r * r - Rg * Rg);

	dhdH = vec4(dmin, dmax, dminp, dmaxp);	
}


// 2 layer (upper half = clouds level layer, lower half = ground level layer) 
// Texture size is 256 x 256
vec3 Layer2 (vec2 coords, float RES_R)
{
	return coords.y > 0.5? vec3(coords.x, coords.y * RES_R -1., 2.):vec3(coords.x, coords.y * RES_R, 0.);
}

// 4 layer
// Texture size = 256 x 512
vec3 Layer4 (vec2 coords, float RES_R)
{
    return	coords.y > 0.75?	vec3(coords.x, coords.y * RES_R -3., 8. ):	// atmosphere level layer
    		coords.y > 0.5 ?	vec3(coords.x, coords.y * RES_R -2., 4. ): 
			coords.y > 0.25?	vec3(coords.x, coords.y * RES_R -1., 2. ): 
								vec3(coords.x, coords.y * RES_R	, 0. );	// ground level layer
}

// 8 layer
// Texture size = 256 x 1024
vec3 Layer8 (vec2 coords, float RES_R)
{
    return	coords.y > 0.875?	vec3(coords.x, coords.y * RES_R -7., 24.):	// space level layer
    		coords.y > 0.75 ?	vec3(coords.x, coords.y * RES_R -6., 20.):	
    		coords.y > 0.625?	vec3(coords.x, coords.y * RES_R -5., 16.): 
			coords.y > 0.5  ?	vec3(coords.x, coords.y * RES_R -4., 12.):
			coords.y > 0.375?	vec3(coords.x, coords.y * RES_R -3., 8. ):	// atmosphere level layer
    		coords.y > 0.25 ?	vec3(coords.x, coords.y * RES_R -2., 4. ): 
			coords.y > 0.125?	vec3(coords.x, coords.y * RES_R -1., 2. ): 
								vec3(coords.x, coords.y * RES_R	, 0. );	// ground level layer
}

// 16 layer
// Texture size = 256 x 2048
vec3 Layer16 (vec2 coords, float RES_R)
{
    return	coords.y > (15.0/16.)?	vec3(coords.x, coords.y * RES_R -15., 30.): // space level layer
			coords.y > (14.0/16.)?	vec3(coords.x, coords.y * RES_R -14., 28.):	
    		coords.y > (13.0/16.)?	vec3(coords.x, coords.y * RES_R -13., 26.):	
    		coords.y > (12.0/16.)?	vec3(coords.x, coords.y * RES_R -12., 24.): 
			coords.y > (11.0/16.)?	vec3(coords.x, coords.y * RES_R -11., 22.): 
			coords.y > (10.0/16.)?	vec3(coords.x, coords.y * RES_R -10., 20.):	
    		coords.y > ( 9.0/16.)?	vec3(coords.x, coords.y * RES_R - 9., 18.): 
			coords.y > ( 8.0/16.)?	vec3(coords.x, coords.y * RES_R - 8., 16.): // atmosphere level layer
			coords.y > ( 7.0/16.)?	vec3(coords.x, coords.y * RES_R - 7., 14.):	
    		coords.y > ( 6.0/16.)?	vec3(coords.x, coords.y * RES_R - 6., 12.):	
    		coords.y > ( 5.0/16.)?	vec3(coords.x, coords.y * RES_R - 5., 10.): 
			coords.y > ( 4.0/16.)?	vec3(coords.x, coords.y * RES_R - 4., 8. ): 
			coords.y > ( 3.0/16.)?	vec3(coords.x, coords.y * RES_R - 3., 6. ):	
    		coords.y > ( 2.0/16.)?	vec3(coords.x, coords.y * RES_R - 2., 4. ): 
			coords.y > ( 1.0/16.)?	vec3(coords.x, coords.y * RES_R - 1., 2. ): 
									vec3(coords.x, coords.y * RES_R	 , 0. );	// ground level layer

}

// 32 layer (full)
// Texture size = 256 x 4096
vec3 Layer32 (vec2 coords, float RES_R)
{
    return	coords.y > (31.0/32.)?	vec3(coords.x, coords.y * RES_R -31., 31.):	// space level layer
    		coords.y > (30.0/32.)?	vec3(coords.x, coords.y * RES_R -30., 30.): 
			coords.y > (29.0/32.)?	vec3(coords.x, coords.y * RES_R -29., 29.):	
    		coords.y > (28.0/32.)?	vec3(coords.x, coords.y * RES_R -28., 28.):	
    		coords.y > (27.0/32.)?	vec3(coords.x, coords.y * RES_R -27., 27.): 
			coords.y > (26.0/32.)?	vec3(coords.x, coords.y * RES_R -26., 26.): 
			coords.y > (25.0/32.)?	vec3(coords.x, coords.y * RES_R -25., 25.):	
    		coords.y > (24.0/32.)?	vec3(coords.x, coords.y * RES_R -24., 24.): 
			coords.y > (23.0/32.)?	vec3(coords.x, coords.y * RES_R -23., 23.):
			coords.y > (22.0/32.)?	vec3(coords.x, coords.y * RES_R -22., 22.):	
    		coords.y > (21.0/32.)?	vec3(coords.x, coords.y * RES_R -21., 21.):	
    		coords.y > (20.0/32.)?	vec3(coords.x, coords.y * RES_R -20., 20.): 
			coords.y > (19.0/32.)?	vec3(coords.x, coords.y * RES_R -19., 19.): 
			coords.y > (18.0/32.)?	vec3(coords.x, coords.y * RES_R -18., 18.):	
    		coords.y > (17.0/32.)?	vec3(coords.x, coords.y * RES_R -17., 17.): 
			coords.y > (16.0/32.)?	vec3(coords.x, coords.y * RES_R -16., 16.):  // atmosphere level layer
    		coords.y > (15.0/32.)?	vec3(coords.x, coords.y * RES_R -15., 15.):
			coords.y > (14.0/32.)?	vec3(coords.x, coords.y * RES_R -14., 14.):	
    		coords.y > (13.0/32.)?	vec3(coords.x, coords.y * RES_R -13., 13.):	
    		coords.y > (12.0/32.)?	vec3(coords.x, coords.y * RES_R -12., 12.): 
			coords.y > (11.0/32.)?	vec3(coords.x, coords.y * RES_R -11., 11.): 
			coords.y > (10.0/32.)?	vec3(coords.x, coords.y * RES_R -10., 10.):	
    		coords.y > ( 9.0/32.)?	vec3(coords.x, coords.y * RES_R - 9., 9.): 
			coords.y > ( 8.0/32.)?	vec3(coords.x, coords.y * RES_R - 8., 8.): 
			coords.y > ( 7.0/32.)?	vec3(coords.x, coords.y * RES_R - 7., 7.):	
    		coords.y > ( 6.0/32.)?	vec3(coords.x, coords.y * RES_R - 6., 6.):	
    		coords.y > ( 5.0/32.)?	vec3(coords.x, coords.y * RES_R - 5., 5.): 
			coords.y > ( 4.0/32.)?	vec3(coords.x, coords.y * RES_R - 4., 4.): 
			coords.y > ( 3.0/32.)?	vec3(coords.x, coords.y * RES_R - 3., 3.):	
    		coords.y > ( 2.0/32.)?	vec3(coords.x, coords.y * RES_R - 2., 2.): 
			coords.y > ( 1.0/32.)?	vec3(coords.x, coords.y * RES_R - 1., 1.): 
									vec3(coords.x, coords.y * RES_R	 , 0. );	// ground level layer

}


vec3 MultiLayers (vec2 coords, float RES_R)
{
    
	if (abs(RES_R - 32.)<epsion){
		return	Layer32	(coords, RES_R);
	}else
	if (abs(RES_R - 16.)<epsion){
		return	Layer16	(coords, RES_R);
	}else
	if (abs(RES_R - 8.)<epsion ){
		return	Layer8	(coords, RES_R);
	}else
	if (abs(RES_R - 4.)<epsion ){
		return	Layer4	(coords, RES_R);
	}else
	{	 return	Layer2	(coords, RES_R);
    }
}

vec2 GetTransmittanceUV(float r, float mu) 
{ 
    float uR, uMu; 
#ifdef TRANSMITTANCE_NON_LINEAR 
	uR = sqrt((r - Rg) / (Rt - Rg)); 
	uMu = atan((mu + 0.15) / (1.0 + 0.15) * tan(1.5)) / 1.5; 
#else 
	uR = (r - Rg) / (Rt - Rg); 
	uMu = (mu + 0.15) / (1.0 + 0.15); 
#endif 
    return vec2(uMu, uR); 
} 
// transmittance(=transparency) of atmosphere for infinite ray (r,mu) 
// (mu=cos(view zenith angle)), intersections with ground ignored 
// vec3 Transmittance(float r, float mu) 
// { 
// 	vec2 uv = GetTransmittanceUV(r, mu);
//     return texture2D(_Transmittance, uv).rgb;
// } 


// ---------------------------------------------------------------------------- 
// TRANSMITTANCE FUNCTIONS 
// ---------------------------------------------------------------------------- 
	// transmittance(=transparency) of atmosphere for infinite ray (r,mu)
	// (mu=cos(view zenith angle)), intersections with ground ignored
vec3 Transmittance(float r, float mu) 
{
   	float uR, uMu;
#ifdef TRANSMITTANCE_NON_LINEAR
    uR = sqrt((r - Rg) / (Rt - Rg));
    uMu = atan((mu + 0.15) / (1.0 + 0.15) * tan(1.5)) / 1.5;
#else
    uR = (r - Rg) / (Rt - Rg);
    uMu = (mu + 0.15) / (1.0 + 0.15);
#endif    
    return texture2D(_Transmittance, vec2(uMu, uR)).rgb;
}
// transmittance(=transparency) of atmosphere between x and x0 
// assume segment x,x0 not intersecting ground 
// d = distance between x and x0, mu=cos(zenith angle of [x,x0) ray at x) 
vec3 Transmittance(float r, float mu, float d)
{ 
    vec3 result; 
    float r1 = sqrt(r * r + d * d + 2.0 * r * mu * d); 
    float mu1 = (r * mu + d) / r1;
    // UNITY_FLATTEN 
    if (mu > 0.0) { 
        result = min(Transmittance(r, mu) / Transmittance(r1, mu1), 1.0); 
    } else { 
        result = min(Transmittance(r1, -mu1) / Transmittance(r, -mu), 1.0); 
    } 

    return result; 
}
// ---------------------------------------------------------------------------- 
// INSCATTER FUNCTIONS 
// ---------------------------------------------------------------------------- 
void Integrand(float r, float mu, float muS, float nu, float t, out vec3 ray, out float mie) 
{ 
    ray = vec3(0.,0.,0.); 
    mie = 0.0; // single channel only
    float ri = sqrt(r * r + t * t + 2.0 * r * mu * t); 
    // float muSi = (nu * t + muS * r) / ri ; // original code
    float muSi = (nu * t + muS * r) / (ri * mix(1.0, betaR.w, max(0.0, muS))); // added betaR.w to fix the Rayleigh Offset artifacts issue
    ri = max(Rg, ri); 
    //UNITY_FLATTEN
    if (muSi >= -sqrt(1.0 - Rg * Rg / (ri * ri ))) 
    { 
        vec3 ti = Transmittance(r, mu, t) * Transmittance(ri, muSi); 
        ray = exp(-(ri - Rg) / HR) * ti; 
        mie = exp(-(ri - Rg) / HM) * ti.x; // only calc the red channel
    } 
} 

void Inscatter(float r, float mu, float muS, float nu, out vec3 ray, out float mie) 
{ 
    ray = vec3(0.,0.,0.); 
    mie = 0.0; // single channel only
    float dx = Limit(r, mu) / float(INSCATTER_INTEGRAL_SAMPLES); 
    float xi = 0.0; 
    vec3 rayi; 
    float miei; 
    Integrand(r, mu, muS, nu, 0.0, rayi, miei); 

    for (int i = 1; i <= INSCATTER_INTEGRAL_SAMPLES; ++i) 
    { 
        float xj = float(i) * dx; 
        vec3 rayj; 
        float miej; 
        Integrand(r, mu, muS, nu, xj, rayj, miej); 
        
        ray += (rayi + rayj) / 2.0 * dx; 
        mie += (miei + miej) / 2.0 * dx; 
        xi = xj; 
        rayi = rayj; 
        miei = miej; 
    } 
    
    ray *= betaR.xyz; 
    mie *= betaMSca.x; 
} 
void main() {
	 
    vec3 ray;
    float mie; // only calc the red channel
    vec4 dhdH;
    float mu, muS, nu, r;

  	vec2 coords = v_Uv; // range 0 ~ 1.
    //	vec2 coords = vec2 ( IN.uv.x * float(RES_MU_S * RES_NU), IN.uv.y * float(RES_MU)); // TexelSize range

    // ----------------------------------------
    //  uSkyPro custom altitude layer override
    // ----------------------------------------

	// Total range of depth/layers is 0 ~ 31. Texture size is 256 x 128 per layer.
	// MultiLayers() function is in "AtmosphereLayers.cginc".
	vec3 uvLayer = (RES_R > 1.)? MultiLayers (coords, RES_R) :	vec3(coords, 1.);

    // ------------------------------------  

	GetLayer(uvLayer.z, r, dhdH); 
    GetMuMuSNu(uvLayer.xy, r, dhdH, mu, muS, nu); 
  
    Inscatter(r, mu, muS, nu, ray, mie); 
    
	// store only red component of single Mie scattering (cf. 'Angular precision')
	gl_FragColor =vec4(ray,mie);

	
	// gl_FragColor = texture2D(_Transmittance,v_Uv);// vec4( col, alpha );vec4(mu, muS, nu,1.);//dhdH*.5;//vec4((r-Rg )/5. );//vec4(uvLayer.z-7.9);// 
	// gl_FragColor.a =1.;


}