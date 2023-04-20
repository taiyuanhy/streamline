import {
	Color3
} from "../../../build/t3d.module.js"

// / <summary>
// / Night sky settings for uSkyPro.
// / </summary>

export class NightSkySettings {

	constructor(nightMode, nightZenithColor, nightHorizonColor, starIntensity, outerSpaceIntensity, moonInnerCorona, moonOuterCorona, moonSize) {
		this.nightMode = nightMode; // NightModes//Static = 0, Rotation = 1

		// [Tooltip ("The zenith color of the night sky. (Top of the night sky)")]
		this.nightZenithColor = nightZenithColor;

		// [Tooltip ("The horizon color of the night sky gradient.\nThis Alpha value controls the night fog height in skybox")]
		this.nightHorizonColor = nightHorizonColor;

		// [Range(0.0f, 5.0f)]//[Tooltip ("Control the intensity of the Star field in night sky.\nIf this value is at zero, stars rendering will be disabled")]
		this.starIntensity = starIntensity;

		// [Range(0.0f, 2.0f)]//[Tooltip ("This controls the intensity of the Outer Space Cubemap in night sky.")]
		this.outerSpaceIntensity = outerSpaceIntensity;

		// [Tooltip ("The color of the moon's inner corona.\n This Alpha value controls the size and blurriness corona.")]
		this.moonInnerCorona = moonInnerCorona;

		// [Tooltip ("The color of the moon's outer corona.\nThis Alpha value controls the size and blurriness corona.")]
		this.moonOuterCorona = moonOuterCorona;

		// [Range(0.0f, 5.0f)]//[Tooltip ("This controls the moon texture size in the night sky.")]
		this.moonSize = moonSize;
	}

}
// / <summary>
// / Other settings for uSkyPro
// / </summary>

export class OtherSettings {

	constructor(groundOffset, altitudeScale, disableSkyboxOcean, HDRMode) {
		// [Range(0.0f, 10000.0f)]//[Tooltip ("This is a constant altitude offset for camera view position in Skybox.\nHigher the value means the height of the camera view position will offset to atmosphere level.")]
		this.groundOffset = groundOffset;

		// [Range(0.0f,20.0f)]//[Tooltip ("This is a current camera height position multiplier in Skybox.\nHigher the value means the camera height position will move faster to atmosphere level." +
		// "\n\nIf the value is 0, the camera is always viewing at the sea level, and skybox horizion will not produce any curve effect." +
		// "\nIf both ground offset and altitude scale are always set to 0 value, recommended just uses Altitude Sample X1 for better rendering performance.")]
		this.altitudeScale = altitudeScale;

		// [Tooltip ("Disable the default ocean rendering effect on the Skybox.\nThere are no performance gain by disabled it.")]
		this.disableSkyboxOcean = disableSkyboxOcean;

		// [Tooltip ("Toggle it if the Main Camera is using HDR mode and Tonemapping image effect.")]
		this.HDRMode = HDRMode;
	}

}


// / <summary>
// / Precompute settings for uSkyPro
// / </summary>

export class PrecomputeSettings {

	constructor(atmosphereThickness, wavelengths, skyTint, inscatterAltitudeSample, groundColor) {
		// TODO;
		// The AtmosphereThickness value higher than 1.8 products ugly artifacts on Windows platform.
		// So temporary we clamped the maximum to 1.8 for now until fixed the artifacts issue.
		// [Range (0f, 1.8f)]//[Tooltip ("Rayleigh scattering density scale. Increase this value produces typical earth-like sky colors (reddish/yellowish colors at sun set, and the like).")]
		this.atmosphereThickness = atmosphereThickness;

		// [Tooltip ("It is visible spectrum light waves (range 380 to 780).\n\nTweaking these values will shift the colors of the resulting gradients and produce different kinds of atmospheres.")]
		this.wavelengths =  wavelengths; // sea level mieVector3

		// [Tooltip ("Tweaking this color value is simular to change the Wavelengths value to shift the colors of the sky.\nThis is just for more artist friendly control of wavelengths.")]
		this.skyTint = skyTint;

		// liufang start
		// this.groundColor =groundColor;
		// liufang end

		// [Tooltip ("Number of different altitudes at which to sample inscatter color.\n\nX1 is a single inscatter sample for ground level only.\nIt uses also less calculation in the shader for better rendering performance. (Texture Memory: 256KB)" +
		// "\n\nX4 includes atmosphere level inscatter samples that divided into four layers, which allows camera to travel nearby atmosphere on the earth with correct inscatter color. (Texture Memory: 1.0MB)")]
		this.inscatterAltitudeSample = inscatterAltitudeSample;
	}
	// DepthSample

}

// / <summary>
// / Default settings for uSkyTimeline
// / </summary>

export class DefaultTimelineSettings {

	constructor() {
		// [Range(-180.0f, 180.0f)]
		// [Tooltip ("Controls the sun light direction align horizionally.")]
		this.sunDirection;

		// [Range(-60.0f, 60.0f)]
		// [Tooltip ("Controls sun path offset")]
		this.sunEquatorOffset;

		// [Range(-60.0f, 60.0f)]
		// [Tooltip ("Controls the moon position in \"Rotation\" night mode\n\nIf night sky is \"Static\", the moon can be rotate freely with rotation tool in Editor.")]
		this.moonPositionOffset;
	}

}

// / <summary>
// / Realistic settings for uSkyTimeline
// / </summary>

export class RealisticTimelineSettings {

	constructor() {
		// [Range (-90.0f, 90.0f)]
		this.latitude;

		// [Range (-180.0f, 180.0f)]
		this.longitude;

		// [Range(1,31)]//[Tooltip("Note: The value of maximum day in month will dynamically clamped according to which month of the year.")]
		this.day = 1;

		// [Range(1,12)]
		this.month = 1;

		[HideInInspector] // <---  need "Year" to expose in the Inspector? then remove the hide flag
		this.year = 2016;

		// [Range(-14, 14)]//[Tooltip ("UTC / Time Zone")]
		this.GMTOffset = 0;
	}

}

// / <summary>
// / Play cycle setting for uSkyTimeline
// / </summary>

export class DayNightCycleSettings {

	constructor() {
		this.playAtRuntime;

		// [Tooltip ("Controls how fast the play speed during day and night cycles.\n\nDefault time curve keys have been set to 25% faster at night." +
		// "\n\nCurve key value of 1 means no speed change, and if key value is higher means the play speed is faster, vice versa.")]
		this.cycleSpeedCurve; // AnimationCurve

		// [Tooltip("Controls how much the distance when sun moves between Interval update.")]
		this.playSpeed;

		// [Tooltip ("Update Timeline per second." +
		// "\n\nBy default the Reflection Probes \"RunTime Time Slicing\" is set to \"All Face At Once\" which spreads update over 9 frames. So the minimum value should be arround 0.3." +
		// "\n\nIf this value is 0 means it will update everyframe, in this case the Reflection Probes Updater \"RunTime Time Slicing\" should set to \"No Time Slicing\"")]
		this.steppedInterval;
	}

}

// / <summary>
// / Ambient gradients for uSkyLighting
// / </summary>

export class AmbientGradientSettings {

	constructor() {
		// [Tooltip ("Enabled this toggle to switch RenderSettings ambient source to gradient mode." +
		// "\n\nDisable it if using the skybox ambient lighting from Lighting window setting.\n(Currently skybox ambient lighting doesn't work correctly in this Beta version)")]
		this.useGradientMode;

		// [Tooltip("Ambient lighting coming from above.")]
		this.SkyColor; // Gradient

		// [Tooltip("Ambient lighting coming from side.")]

		this.EquatorColor;
		// [Tooltip("Ambient lighting coming from below.")]
		this.GroundColor;
	}

}
// / <summary>
// / World inscatter settings for uSkyAtmosphericScattering.
// / </summary>

export class WorldInscatterSettings {

	constructor() {
		// [Tooltip ("Enable World Atmospheric Scattering Image Effect")]
		this.enableScattering;

		// [Tooltip ("Control the inscattering intensity on the earth")]
		// [Range (0.0f, 5.0f)]
		this.scatteringIntensity;

		// [Tooltip ("How much light is out-scattered or absorbed on the earth. Basically how much to darken the shaded pixel.")]
		// [Range (0.0f, 1.0f)]
		this.scatterExtinction;

		// [Tooltip ("Control the world scale factor for the scattering on the earth")]
		this.worldScatterScale;

		// [Tooltip("Allows the scattering to be pushed out to have no scattering directly in front of the camera, or pulled in to have more scattering close to the camera.")]
		this.nearScatterPush;

		//		//[Tooltip ("Controls the down sample scale of the screen resolution for occlusion gathering.")]
		//		public ScatterDownscaleMode	scatterDownscale;
	}

}

// / <summary>
// / Scatter occlusion settings for uSkyAtmosphericScattering.
// / </summary>

export class ScatterOcclusionSettings {

	constructor() {
		// [Tooltip ("This flag enables scatter occlusion")]
		this.useOcclusion;

		// [Tooltip ("Controls how dark the occlusion on earth.\nA value of 0 results full occlusion darkening.\nA value of 1 results no darkening term.")]
		// [Range (0.0f,1.0f)]
		this.occlusionDarkness;

		// [Tooltip ("Controls the down sample scale of the screen resolution for occlusion gathering.")]
		this.occlusionDownscale; // OcclusionDownscaleMode

		// [Tooltip ("The number of samples to use in occlusion gathering.")]
		this.occlusionSamples; // OcclusionSamplesMode

		// [Tooltip ("Draw occlusion pass only.")]
		this.occlusionDebug;
	}

}
export class uSkysettings {

	constructor() {
		// / <summary>
		// / This is the settings used through out uSky
		// / </summary>

		// / <summary>
		// / The Night Sky type settings for uSkyPro
		// / </summary>
		this.NightModes = {
			Static: 0,
			Rotation: 1
		}

		// / <summary>
		// / The number of altitudes sample .
		// / </summary>
		this.DepthSample = {
			X1: 1,
			// X2	: 2,
			X4: 4,
			// X8	: 8,
			// X16 : 16,
			// X32 : 32
		}

		// / <summary>
		// / The Time settings type between Default and Realistic for uSkyTimeline
		// / </summary>
		this.TimeSettingsMode = {
			Default: 0,
			Realistic: 1
		}

		//	this.ScatterDownscaleMode { x1 : 1, x2 : 2, x4 : 4 }

		this.OcclusionDownscaleMode = {
			x1: 1,
			x2: 2,
			x4: 4
		}
		this.OcclusionSamplesMode = {
			x64: 0,
			x164: 1,
			x244: 2
		}

		//	this.TextureType { Transmittance : 0, Inscatter : 1 }
	}

}