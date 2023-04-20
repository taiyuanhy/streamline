#include <common_frag>
precision highp sampler3D;
uniform sampler2D _Transmittance;
uniform sampler2D _Inscatter;
uniform float	_uSkyExposure;
uniform float	_uSkyMieG;
uniform float	_uSkyMieScale;
uniform vec4	_SunDirSize;
uniform vec3	_uSkyNightParams;
uniform vec4 _LightColor0; 

uniform sampler2D	_MoonSampler;
uniform samplerCube	_OuterSpaceCube;
uniform vec4 _uSkyGroundColor;
uniform vec4 _NightZenithColor,_NightHorizonColor, _MoonInnerCorona, _MoonOuterCorona;
uniform vec4 _MoonDirSize;
uniform mat4 _SpaceRotationMatrix;
uniform float OuterSpaceIntensity;

uniform vec4 betaR;

varying vec3 v_normal;
varying vec2 v_Uv;
varying vec4 worldPosAndCamHeight;
varying vec3 MiePhase_g;
varying vec3 Sun_g	;
varying vec2 moonTC	;
varying vec3 spaceTC;	

uniform float flip;
uniform float level;
uniform float _uSkySkyboxOcean;
varying vec3 vDir;


const float Rg = 6360000.0;
const float Rt = 6420000.0;
const float RL = 6421000.0;

uniform float RES_R; 		// 3D texture depth
const float RES_MU = 128.; 	// height of the texture
const float RES_MU_S = 32.; // width per table
const float RES_NU = 8.;	// table per texture depth

const vec3 EARTH_POS = vec3(0.0, 6360010.0, 0.0);
const float SUN_BRIGHTNESS = 40.0;
// const vec3 betaR = vec3(5.8e-3, 1.35e-2, 3.31e-2);
// medium precision for mobile
const float SUN_BRIGHTNESS_MEDIUMP = 40.0;
//--------------------------------------------------------------------------------------------------
#define TRANSMITTANCE_NON_LINEAR
// #define INSCATTER_NON_LINEAR

// 4D data in Texture2D format
vec4 Texture4D(sampler2D table, float r, float mu, float muS, float nu)
{
   	float H = sqrt(Rt * Rt - Rg * Rg);
   	float rho = sqrt(r * r - Rg * Rg);
#ifdef INSCATTER_NON_LINEAR
    float rmu = r * mu;
    float delta = rmu * rmu - r * r + Rg * Rg;
    vec4 cst = rmu < 0.0 && delta > 0.0 ? vec4(1.0, 0.0, 0.0, 0.5 - 0.5 / RES_MU) : vec4(-1.0, H * H, H, 0.5 + 0.5 / RES_MU);     
    float uR = 0.5 / RES_R + rho / H * (1.0 - 1.0 / RES_R);
    float uMu = cst.w + (rmu * cst.x + sqrt(delta + cst.y)) / (rho + cst.z) * (0.5 - 1.0 / float(RES_MU));

    // paper formula
    //float uMuS = 0.5 / RES_MU_S + max((1.0 - exp(-3.0 * muS - 0.6)) / (1.0 - exp(-3.6)), 0.0) * (1.0 - 1.0 / RES_MU_S);
    // better formula
    float uMuS = 0.5 / RES_MU_S + (atan(max(muS, -0.1975) * tan(1.26 * 1.1)) / 1.1 + (1.0 - 0.26)) * 0.5 * (1.0 - 1.0 / RES_MU_S);

	if (_uSkySkyboxOcean == 0.)
		uMu = rmu < 0.0 && delta > 0.0 ? 0.975 : uMu * 0.975 + 0.015 * uMuS; // 0.975 to fix the horizion seam. 0.015 to fix zenith artifact

#else
    float uR = 0.5 / RES_R + rho / H * (1.0 - 1.0 / RES_R);
    float uMu = 0.5 / RES_MU + (mu + 1.0) / 2.0 * (1.0 - 1.0 / RES_MU);
    float uMuS = 0.5 / RES_MU_S + max(muS + 0.2, 0.0) / 1.2 * (1.0 - 1.0 / RES_MU_S);
#endif
    float lep = (nu + 1.0) / 2.0 * (RES_NU - 1.0);
    float uNu = floor(lep);
    lep = lep - uNu;

    //Original 3D lookup
    //return tex3D(table, float3((uNu + uMuS) / RES_NU, uMu, uR)) * (1.0 - lep) + tex3D(table, float3((uNu + uMuS + 1.0) / RES_NU, uMu, uR)) * lep;

    float uNu_uMuS = uNu + uMuS;

#ifdef USKY_MULTISAMPLE  
    //new 2D lookup
	float u_0 = floor(uR * RES_R) / RES_R;
	float u_1 = floor(uR * RES_R + 1.0) / RES_R;
	float u_frac = fract(uR * RES_R);

	// pre-calculate uv
	float uv_0X = uNu_uMuS / RES_NU;
	float uv_1X = (uNu_uMuS + 1.0) / RES_NU;
	float uv_0Y = uMu / RES_R + u_0;
	float uv_1Y = uMu / RES_R + u_1;
	float OneMinusLep = 1.0 - lep;

	vec4 A = texture2D(table, vec2(uv_0X, uv_0Y)) * OneMinusLep + texture2D(table, vec2(uv_1X, uv_0Y)) * lep;	
	vec4 B = texture2D(table, vec2(uv_0X, uv_1Y)) * OneMinusLep + texture2D(table, vec2(uv_1X, uv_1Y)) * lep;	

	return A * (1.0-u_frac) + B * u_frac;

#else	
	return texture2D(table, vec2(uNu_uMuS / RES_NU, uMu)) * (1.0 - lep) + texture2D(table, vec2((uNu_uMuS + 1.0) / RES_NU, uMu)) * lep;	
#endif

}
vec3 GetMie(vec4 rayMie) 
{	
	// approximated single Mie scattering (cf. approximate Cm in paragraph "Angular precision")
	// rayMie.rgb=C*, rayMie.w=Cm,r
   	return rayMie.rgb * rayMie.w / max(rayMie.r, 1e-4) * (betaR.r / betaR.xyz);
}

float PhaseFunctionR(float mu) // original code (not in use)
{
	// Rayleigh phase function
    return (3.0 / (16.0 * PI)) * (1.0 + mu * mu);
}
float PhaseFunctionR() // optimized
{
	// Rayleigh phase function without multiply (1.0 + mu * mu)
	// We will multiply (1.0 + mu * mu) together with Mie phase later.
    return 3.0 / (16.0 * PI);
}

float PhaseFunctionM(float mu, vec3 miePhase_g)  // optimized
{
	// Mie phase function (optimized)
	// Precomputed PhaseFunctionG() with constant values in vertex program and pass them in here
	// we will multiply (1.0 + mu * mu) together with Rayleigh phase later.
	return miePhase_g.x / pow( miePhase_g.y - miePhase_g.z * mu, 1.5 );
}

vec3 PhaseFunctionG(float g, float scale) 
{
	// Mie phase G function and Mie scattering scale, (compute this function in Vertex program)
	float g2 = g * g;
	return vec3(scale * 1.5 * (1.0 / (4.0 * PI)) * ((1.0 - g2) / (2.0 + g2)), 1.0 + g2, 2.0 * g);
}

// Sun Disk
float SunFunction(float mu, vec3 miePhase_g)
{
	return PhaseFunctionM(mu, miePhase_g) * (1.0 + mu * mu);
}
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

// [Range (1e-3f,10.0f)][Tooltip ("Size of the sun spot in the sky")]
// const float SunSize = 1.0;
// const m_Sun = 0; //m_Sun: {fileID: 0}
// vec4 SunDirectionAndSize ()
// {
// 	return vec4(0.321,0.766,0.557, SunSize); 
//     // return m_Sun ?	vec4 (-m_Sun.transform.forward.x,-m_Sun.transform.forward.y,-m_Sun.transform.forward.z, SunSize):
//     //                 vec4(0.321,0.766,-0.557, SunSize); 
// }
float DayTimeBrightness ()
{ 
    // DayTime : Based on Bruneton's uMuS Linear function ( modified : calculate at ground/sea level only)
    return clamp(max(_SunDirSize.y + 0.2, 0.0) / 1.2,0.,1.);
}

/// Nights sky brightness at night time. (Ready Only)
float NightTimeBrightness ()
{ 
    return 1. - DayTimeBrightness(); 
}

/// Space cubemap fade in and out at day/night cycle. (Ready Only)
float NightFade ()
{ 
    return pow(NightTimeBrightness(), 4.);
} 
// ---------------------------------------------------------------------------- 
// INSCATTER FUNCTIONS (SKYBOX)
// ---------------------------------------------------------------------------- 
	// scattered sunlight between two points
	// camera=observer
	// viewdir=unit vector towards observed point
	// sundir=unit vector towards the sun
	// return scattered light
	
	// optimized scattering phase formula

vec3 SkyRadiance(vec3 camera, vec3 viewdir, float nu, vec3 MiePhase_g, out vec3 extinction)
{
	camera += EARTH_POS;

   	vec3 result = vec3(0.,0.,0.);
    float r = length(camera);
    float rMu = dot(camera, viewdir);
    float mu = rMu / r ;

    float deltaSq = sqrt(rMu * rMu - r * r + Rt*Rt);
    float din = max(-rMu - deltaSq, 0.0);
    
    if (din > 0.0) 
    {
       	camera += din * viewdir;
       	rMu += din;
       	mu = rMu / Rt;
       	r = Rt;
    }
    
    // float nu = dot(viewdir, _SunDirSize.xyz); // nu value is from function input
    float muS = dot(camera, _SunDirSize.xyz) / r;

    vec4 inScatter =  Texture4D(_Inscatter, r, rMu / r, muS, nu);

    extinction = Transmittance(r, mu); 

    if(r <= Rt ) 
    {
        vec3 inScatterM = GetMie(inScatter);
        float phase = PhaseFunctionR();
        float phaseM = PhaseFunctionM(nu, MiePhase_g);
        result = (inScatter.rgb * phase + inScatterM * phaseM)*(1.0 + nu * nu);
    }
    else
    {
    	result = vec3(0.,0.,0.);
    	extinction = vec3(1.,1.,1.);
    }
    return result * SUN_BRIGHTNESS;
}

vec3 hdr(vec3 L) 
{
    L.r = L.r < 1.413 ? pow(L.r * 0.38317, 1.0 / 2.2) : 1.0 - exp(-L.r);
    L.g = L.g < 1.413 ? pow(L.g * 0.38317, 1.0 / 2.2) : 1.0 - exp(-L.g);
    L.b = L.b < 1.413 ? pow(L.b * 0.38317, 1.0 / 2.2) : 1.0 - exp(-L.b);
    return L;
}

// switch different tonemapping methods between day and night
vec3 hdr2(vec3 L) 
{
    L = mix(hdr(L),1.0 - exp(-L), NightFade());
    return L;
}


#if defined(UNITY_COLORSPACE_GAMMA)
	#define COLOR_2_LINEAR(color) color*(0.4672*color+0.266)
	#define GAMMA_2_OUTPUT(color) color
	#define HDR_OUTPUT(color)  pow(color* 1.265, 0.735)
#else
	#define COLOR_2_LINEAR(color) color*color
	#define GAMMA_2_OUTPUT(color) color*color
	#define HDR_OUTPUT(color) color* 0.6129
#endif
void main() {
	 
	vec3 dir = normalize(worldPosAndCamHeight.xyz);//  worldPosAndCamHeight [0  1]
	vec3 camera = vec3(0.0, worldPosAndCamHeight.w, 0.0);//观察位
	float nu = dot( dir, _SunDirSize.xyz); // sun direction太阳方向
		
	vec3 extinction= vec3(1.);
	// inscatter散射
	vec3 col = SkyRadiance(camera, dir, nu, MiePhase_g, extinction) ; 

	//白天天空的颜色
	vec3 daySkyColor = vec3(0.,0.,0.);
//----------------------------------------------------------------------------------	
	// night sky夜晚天空
	vec3 nightSkyColor = vec3(0.,0.,0.);
	float moonMask = 0.0;
	float gr = 1.0;


	if ( _SunDirSize.y < 0.25 )
	{	
		// add horizontal night sky gradient加上水平夜空梯度
		gr = clamp(extinction.z * .25 / _NightHorizonColor.w ,0.,1.);
		//gr = clamp(extinction.z * .25 / _uSkyGroundColor.w );
		gr *= 2. - gr;

		nightSkyColor = mix(_NightHorizonColor.xyz, _NightZenithColor.xyz, gr);
		// add moon and outer space
		vec4 moonAlbedo = texture2D ( _MoonSampler, moonTC.xy );
		moonMask = moonAlbedo.a * _uSkyNightParams.y;
		

		//t3d skybox
		vec3 V = normalize(spaceTC);
		vec3 coordVec = vec3(flip * V.x, V.yz);
		vec4 spaceAlbedo = mapTexelToLinear(textureCube(_OuterSpaceCube, coordVec, level));

		// vec4 spaceAlbedo = textureCube (_OuterSpaceCube, spaceTC);	//mapTexelToLinear(textureCube(_OuterSpaceCube, spaceTC, level)); //	
		nightSkyColor += ( moonAlbedo.rgb * _uSkyNightParams.y + spaceAlbedo.rgb * (max(1.-moonMask,gr) * NightFade() * OuterSpaceIntensity)) * gr ;

		// moon corona月晕
		float m = 1. - dot( dir, _MoonDirSize.xyz);
		nightSkyColor += _MoonInnerCorona.xyz * (1.0 / (1.05 + m * _MoonInnerCorona.w));
		nightSkyColor += _MoonOuterCorona.xyz * (1.0 / (1.05 + m * _MoonOuterCorona.w));
	}
	// else{
		//liufang start
		// float p = v_Uv;
		// float p1 = 1. - pow(min(1., 1. - p), 10.98);
		// float p3 = 1. - pow(min(1., 1. + p), 3.49);
		// float p2 = 1. - p1 - p3;


		// col+=(vec3(1.,1.,1.)*p2+_uSkyGroundColor.xyz*p3);
		// col-=(1.-_uSkyGroundColor.w)*p3;
		//liufang end 
	// }


//----------------------------------------------------------------------------------	
	#ifndef USKY_HDR_MODE
		col += nightSkyColor;
		col = GAMMA_2_OUTPUT(hdr2(col*_uSkyExposure));
		// col = GAMMA_2_OUTPUT(HDRtoRGB(col*_uSkyExposure*1.5));
	#else
		col += COLOR_2_LINEAR(nightSkyColor);// TODO : not accurate不准确
		col = HDR_OUTPUT(col*_uSkyExposure);
	#endif

		// add sun disc加太阳光盘
	#ifdef USKY_SUNDISK
		float sun = SunFunction(nu, Sun_g); 
		col  +=  (sun * sign(_LightColor0.w)) * extinction;
	#endif
		
	float alpha = mix( 1.0, max(1e-3, moonMask+(1.-gr)), _uSkyNightParams.x);
	// col = SkyRadiance(camera, dir, nu, MiePhase_g, extinction) ; 	
	vec3 V = normalize(spaceTC);
	vec3 coordVec = vec3(flip * V.x, V.yz);
	//col = SkyRadiance(camera, dir, nu, MiePhase_g, extinction) ; 
	gl_FragColor =vec4(col,1.); // vec4(moonTC,0.,1. );
	// vec4(sign(-1.),0.,0.,1.);// 
	// vec2 st = vec2(v_Uv.x +time ,v_Uv.y);
	// gl_FragColor = mapTexelToLinear(textureCube(_OuterSpaceCube, coordVec, level)); //texture2D( _CloudSampler, st );
	gl_FragColor.a =1.;
}