uniform sampler2D _CloudSampler;
uniform vec3 _MoonDirSize, _uSkyLightColor, _NightZenithColor;
uniform float _RotateSpeed, _LightColorMultiplier, _SkyColorMultiplier;
uniform float _Attenuation, _StepSize, _AlphaSaturation, _Mask, _ScatterMultiplier;
uniform int _AmbientSource, _Mapping;
uniform float _HeightOffset;
uniform float time;

varying vec4 v_pos;
varying vec2 v_toSun;
varying vec3 v_skyColor;
varying vec3 v_lightColor;
varying vec3 v_worldPos;
varying vec3 v_miePhase_g;
varying vec3 v_lightDir;
varying vec2 v_Uv;
varying vec3 v_normal;

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

/// Space cubemap fade in and out at day/night cycle. (Ready Only)
float NightFade ()
{ 
    return pow(NightTimeBrightness(), 4.);
} 
void main() {

	const int c_numSamples = 8;

	vec3 dir = normalize(v_worldPos.xyz);
	float nu = dot( dir, v_lightDir.xyz);

	// uv
	vec2 sampleDir = v_toSun.xy ;
	//vec2 uv = v_baseTC.xy;
	
	// only use red channel as clouds density 
	float opacity = texture2D( _CloudSampler, v_Uv ).r;
	// user define opacity level (need to clamp to 1 for HDR Camera)
	opacity = min(opacity * _Mask, 1.0); 
	// Increase the "Alpha Opacity" during the night time for better masking out the background moon and stars
	opacity = mix(opacity, min(opacity * 1.15, 1.0), NightFade());// _uSkyNightParams.x

	float density = 0.;
	
	//UNITY_FLATTEN // prevent warning on dxd11 ? : gradient instruction used in a loop with varying iteration, forcing loop to unroll 
	if(opacity > 0.01) // bypass sampling any transparent pixels 
	{
		for( int i = 0; i < c_numSamples; i++ )
		{
			float i_float = float(i);
			vec2 sampleUV = v_Uv +   sampleDir * i_float;
			float t = texture2D( _CloudSampler, sampleUV ).r ;
			density += t;
		}
	}

	// scatter term
	float phase = PhaseFunctionR()* _ScatterMultiplier ;
	float phaseM = PhaseFunctionM(nu, v_miePhase_g);
	float scatter = (phase + phaseM) * (1.0 + nu * nu);

	float c = exp2( -_Attenuation * density + scatter);
	float a = pow( opacity, _AlphaSaturation );
	vec3 col = mix( v_skyColor, v_lightColor, c );

	gl_FragColor = vec4( col, a );
	//
	// vec2 st = vec2(v_Uv.x +time ,v_Uv.y);
	// gl_FragColor = texture2D( _CloudSampler, st );

}