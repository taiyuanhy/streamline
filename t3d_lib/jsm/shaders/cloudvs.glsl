attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec4 a_Tangent;
attribute vec2 a_Uv;
varying vec3 v_normal;
varying vec2 v_Uv;

uniform vec3 _MoonDirSize, _uSkyLightColor, _NightZenithColor,_uSkyColor,_uEquatorColor;
uniform float _RotateSpeed, _LightColorMultiplier, _SkyColorMultiplier;
uniform float _Attenuation, _StepSize, _AlphaSaturation, _Mask, _ScatterMultiplier;
uniform int	 _AmbientSource, _Mapping;
uniform float _HeightOffset;
uniform mat4 u_ProjectionView;
uniform mat4 u_Model;
uniform float time;
uniform float camFar;
uniform vec3 CameraPos;
varying vec4 v_pos;
varying vec2 v_toSun;
varying vec3 v_skyColor;
varying vec3 v_lightColor;
varying vec3 v_worldPos;
varying vec3 v_miePhase_g;
varying vec3 v_lightDir;

const float PI = 3.1415926;
const float OuterSpaceIntensity = 0.25;
// Declares 3x3 matrix 'rotation', filled with tangent space basis
// Do not use multiline define here, nVidia OpenGL drivers are buggy in parsing that.
#define TANGENT_SPACE_ROTATION vec3 binormal = cross( a_Normal.xyz, a_Tangent.xyz ) * a_Tangent.w; mat3 rotation = mat3( a_Tangent.x, binormal.x, a_Normal.x, a_Tangent.y, binormal.y, a_Normal.y, a_Tangent.z, binormal.z, a_Normal.z );
#define GAMMA_OUT(color) pow(color,0.454545)
#define ColorSpaceLuminance vec4(0.22, 0.707, 0.071, 0.0)
vec3 RotateAroundYInDegrees (vec3 vertex, float degrees)
{
	float alpha = degrees * ( PI / 180.0);
	float sina, cosa;
	sina = sin(alpha);
	cosa = cos(alpha);
	mat2 m = mat2(cosa, -sina, sina, cosa);
	return vec3((m * vertex.xz), vertex.y).xzy;
}
// Converts color to luminance (grayscale)
float Luminance(vec3 rgb)
{
    return dot(rgb, ColorSpaceLuminance.rgb);
}

// [Range (1e-3f,10.0f)][Tooltip ("Size of the sun spot in the sky")]
const float SunSize = 1.0;
// const m_Sun = 0; //m_Sun: {fileID: 0}
vec4 SunDirectionAndSize ()
{
	return vec4(0.321,0.766,-0.557, SunSize); 
    // return m_Sun ?	vec4 (-m_Sun.transform.forward.x,-m_Sun.transform.forward.y,-m_Sun.transform.forward.z, SunSize):
    //                 vec4(0.321,0.766,-0.557, SunSize); 
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

///Space cubemap fade in and out at day/night cycle. (Ready Only)
float NightFade ()
{ 
    return pow(NightTimeBrightness(), 4.);
} 
void main() {
	float offsetValue = _RotateSpeed * time;

	vec3 t = RotateAroundYInDegrees(a_Position.xyz, offsetValue).xyz; //  animate rotation
	// scale with camera’s far plane and following camera position.
	// t = t * camFar + CameraPos.xyz ; 
	t.y += _HeightOffset;
	

	vec3 dir =vec3(0.,-.5,1.);//sun dir 
	dir = RotateAroundYInDegrees(dir, -offsetValue);
	v_lightDir = dir;
	TANGENT_SPACE_ROTATION;
	v_toSun = (rotation * dir).xy * _StepSize ;

	// uv mapping
	vec2 scale = vec2(1.);
	vec2 offset = vec2(0.);
    v_Uv = a_Uv * scale + offset ;//( _Mapping == 0 )? TRANSFORM_TEX (rectangular, _CloudSampler): polar ;

    // ambient source from Sky or Equator gradient color
    vec3 unityAmbient =(_AmbientSource == 0)?_uSkyColor:_uEquatorColor;//vec3(145./255.,174./255.,174./255.); //(_AmbientSource == 0)? unity_AmbientSky.xyz : unity_AmbientEquator.xyz;

    // fix the night sky brightness
    float brightnessScale = max(max(Luminance(_NightZenithColor.rgb)*4.,OuterSpaceIntensity), 1.0 - NightFade() );

    // Shade Color
    v_skyColor = unityAmbient * (GAMMA_OUT(_SkyColorMultiplier) * brightnessScale);
    v_lightColor = max(_uSkyLightColor.xyz * _LightColorMultiplier, v_skyColor);
    
	v_worldPos.xyz =(u_Model * vec4(a_Position,1.0)).xyz;
	gl_Position = u_ProjectionView * u_Model * vec4(t, 1.0);
	// v_Uv = a_Uv;
	v_normal = a_Normal;
}