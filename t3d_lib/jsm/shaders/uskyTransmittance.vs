
#include <common_vert>
attribute vec2 a_Uv;
varying vec2 v_Uv;


uniform vec4 _uSkyGroundColor;
uniform vec4 _NightZenithColor,_NightHorizonColor, _MoonInnerCorona, _MoonOuterCorona;
uniform vec4 _MoonDirSize;
uniform mat4 _SpaceRotationMatrix;
uniform float	_uSkyExposure;
uniform float	_uSkyMieG;
uniform float	_uSkyMieScale;

uniform vec4	_SunDirSize;
uniform float	_uSkyGroundOffset;
uniform float	_uSkyAltitudeScale;
uniform float	_uSkyAtmosphereThickness;
uniform float	_uSkySkyboxOcean;

varying vec4 worldPosAndCamHeight;
varying vec3 MiePhase_g			;
varying vec3 Sun_g				;
varying vec2 moonTC				;
varying vec3 spaceTC;
varying vec3 vDir;			
// varying vec2 uv 					

const float PI = 3.1415926;
vec3 PhaseFunctionG(float g, float scale) 
{
	// Mie phase G function and Mie scattering scale, (compute this function in Vertex program)
	float g2 = g * g;
	return vec3(scale * 1.5 * (1.0 / (4.0 * PI)) * ((1.0 - g2) / (2.0 + g2)), 1.0 + g2, 2.0 * g);
}

// [Range (1e-3f,10.0f)][Tooltip ("Size of the sun spot in the sky")]
const float SunSize = 1.0;
const float MoonSize = 1.0;
// const m_Sun = 0; //m_Sun: {fileID: 0}
vec4 SunDirectionAndSize ()
{
	return vec4(0.321,0.766,-0.557, SunSize); 
    // return m_Sun ?	vec4 (-m_Sun.transform.forward.x,-m_Sun.transform.forward.y,-m_Sun.transform.forward.z, SunSize):
    //                 vec4(0.321,0.766,-0.557, SunSize); 
}
vec4 MoonDirectionAndSize ()
{
	return vec4 (0.03261126, -0.9445618, -0.3267102, 8. / MoonSize);
	// return m_Moon ? vec4 (-m_Moon.transform.forward.x, -m_Moon.transform.forward.y, -m_Moon.transform.forward.z, 8f / MoonSize) :
	// 				vec4 (0.03261126, -0.9445618, -0.3267102, 8. / MoonSize);
}
float DayTimeBrightness ()
{ 
    // DayTime : Based on Bruneton's uMuS Linear function ( modified : calculate at ground/sea level only)
    return clamp(max(SunDirectionAndSize().y + 0.2, 0.0) / 1.2,0.,1.);
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
void main() {
	

	v_Uv = a_Uv;
	
	gl_Position = u_ProjectionView * u_Model * vec4(a_Position, 1.0);
	gl_Position.z = gl_Position.w; // set z to camera.far
			
}