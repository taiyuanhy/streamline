import { Matrix4, Vector3 } from "../../../build/t3d.module.js";

class uSkyInternal {

	constructor() {
		// uSkyPro Parameters
		this.m_Exposure;
		this.m_MieScattering;
		this.m_SunAnisotropyFactor;
		this.m_SunSize;

		this.m_StarIntensity;
		this.m_OuterSpaceIntensity;
		this.m_MoonSize;
		this.m_GroundOffset;
		this.m_AltitudeScale;

		this.m_GroundColor;
		this.m_NightZenithColor;
		this.m_NightHorizonColor;
		this.m_MoonInnerCorona;
		this.m_MoonOuterCorona;

		this.m_NightSkyMode = 0;

		this.m_DisableSkyboxOcean;
		this.m_HDRMode;

		// Precomputed Parameters
		this.m_AtmosphereThickness;
		this.m_Wavelengths;
		this.m_SkyTint;
		this.m_InscatterAltitudeSample;

		// Timeline Parameters
		this.m_TimeMode;
		this.m_Timeline;

		this.m_SunDirection;
		this.m_SunEquatorOffset;
		this.m_MoonPositionOffset;
		this.m_Latitude;
		this.m_Longitude;

		this.m_Day;
		this.m_Month;
		this.m_Year;
		this.m_GMTOffset;
		this.TimeSettingsMode = {
			Default: 0, // DefaultTimelineSettings ( Setting),
			Realistic: 1, // RealisticTimelineSettings ( Setting)
		}


		// region Common functions

		// / <summary>
		// / Normalized value of current altitude position of sun
		// / (Range 0.0 to 1.0)
		// / 1	= the sun is at the zenith.
		// / 0.5	= the sun is at the horizon.
		// / 0	= the sun is at the bottom.
		// / </summary>
		this.NormalizedTime = function(m_Sun,  m_Moon) {
			var value = 1;
			if (m_Sun) {	value = -m_Sun.transform.forward.y * 0.5 + 0.5; } else if (m_Moon) {
				value = m_Moon.transform.forward.y * 0.5 + 0.5;
			}
			return value;
		}

		this.SetSpaceAndStarsRotation = function(rotation, material) {
			var m_SpaceMatrix = new Matrix4();
			var identity = new Matrix4();
			m_SpaceMatrix.decompose(new Vector3(0, 0, 0), rotation, new Vector3(1, 1, 1));
			material.uniforms._StarRotationMatrix = (this.m_NightSkyMode == 1) ? m_SpaceMatrix.elements			: identity.elements;
			material.uniforms._SpaceRotationMatrix = (this.m_NightSkyMode == 1) ? m_SpaceMatrix.inverse.elements	: identity.elements;
			// Shader.SetGlobalMatrix ("_StarRotationMatrix" ,	(m_NightSkyMode == 1) ? m_SpaceMatrix			: identity);
			// Shader.SetGlobalMatrix ("_SpaceRotationMatrix", (m_NightSkyMode == 1) ? m_SpaceMatrix.inverse	: identity);
		}

		this.InitTimelineParameters = function(uST) { // uSkyTimeline
			this.m_TimeMode				= Math.floor(uST.Type);
			this.m_Timeline				= uST.Timeline;

			this.m_SunDirection			= uST.SunDirection;
			this.m_SunEquatorOffset		= uST.SunEquatorOffset;
			this.m_MoonPositionOffset	= uST.MoonPositionOffset;

			this.m_Latitude				= uST.Latitude;
			this.m_Longitude				= uST.Longitude;

			this.m_Day					= uST.Day;
			this.m_Month					= uST.Month;
			this.m_Year					= uST.Year;
			this.m_GMTOffset				= uST.GMTOffset;
		}

		this.SetTimeMode = function(NewTimeMode) {
			if (this.m_TimeMode != NewTimeMode) {
				this.m_TimeMode = NewTimeMode;
				// MarkTimelineStateDirty();
			}
		}

		this.SetTimeline = function(NewTimeline) {
			if (this.m_Timeline != NewTimeline) {
				this.m_Timeline = NewTimeline;
				// MarkCycleStateDirty();
				// MarkTimelineStateDirty();
			}
		}

		// function DefaultTimelineSettings(Setting) {
		// 	SetSunDirection(Setting.sunDirection);
		// 	SetSunEquatorOffset(Setting.sunEquatorOffset);
		// 	SetMoonPositionOffset(Setting.moonPositionOffset);
		// }

		// function SetSunDirection(NewSunDirection) {
		// 	if (m_SunDirection != NewSunDirection) {
		// 		m_SunDirection = NewSunDirection;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetSunEquatorOffset(NewEquatorOffset) {
		// 	if (m_SunEquatorOffset != NewEquatorOffset) {
		// 		m_SunEquatorOffset = NewEquatorOffset;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetMoonPositionOffset(NewMoonPositionOffset) {
		// 	if (m_MoonPositionOffset != NewMoonPositionOffset) {
		// 		m_MoonPositionOffset = NewMoonPositionOffset;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function RealisticTimelineSettings(Setting) {
		// 	SetLatitude(Setting.latitude);
		// 	SetLongitude(Setting.longitude);
		// 	SetDay(Setting.day);
		// 	SetMonth(Setting.month);
		// 	SetYear(Setting.year);
		// 	SetGMTOffset(Setting.GMTOffset);
		// }
		// function SetLatitude(NewLatitude) {
		// 	if (m_Latitude != NewLatitude) {
		// 		m_Latitude = NewLatitude;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetLongitude(NewLongitude) {
		// 	if (m_Longitude != NewLongitude) {
		// 		m_Longitude = NewLongitude;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetDay(NewDay) {
		// 	if (m_Day != NewDay) {
		// 		m_Day = NewDay;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetMonth(NewMonth) {
		// 	if (m_Month != NewMonth) {
		// 		m_Month = NewMonth;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetYear(NewYear) {
		// 	if (m_Year != NewYear) {
		// 		m_Year = NewYear;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
		// function SetGMTOffset(NewGMTOffset) {
		// 	if (m_GMTOffset != NewGMTOffset) {
		// 		m_GMTOffset = NewGMTOffset;
		// 		MarkTimelineStateDirty();
		// 	}
		// }
	}

	// Default timeline settings --------------------------

	SetTimelineSettingState(Setting) {
		this.SetSunDirection(Setting.sunDirection);
		this.SetSunEquatorOffset(Setting.sunEquatorOffset);
		this.SetMoonPositionOffset(Setting.moonPositionOffset);
	}

	SetSunDirection(NewSunDirection) {
		if (this.m_SunDirection != NewSunDirection) {
			this.m_SunDirection = NewSunDirection;
			// MarkTimelineStateDirty();
		}
	}
	SetSunEquatorOffset(NewEquatorOffset) {
		if (this.m_SunEquatorOffset != NewEquatorOffset) {
			this.m_SunEquatorOffset = NewEquatorOffset;
			// MarkTimelineStateDirty();
		}
	}
	SetMoonPositionOffset(NewMoonPositionOffset) {
		if (this.m_MoonPositionOffset != NewMoonPositionOffset) {
			this.m_MoonPositionOffset = NewMoonPositionOffset;
			// MarkTimelineStateDirty();
		}
	}
	SetNightSkyMode(NewNightSkyMode) {
		if (this.m_NightSkyMode != NewNightSkyMode) {
			this.m_NightSkyMode = NewNightSkyMode;
			// trigger Timeline to update the Space and Stars rotation
			// MarkTimelineStateDirty();
			// // Update moon element in skybox
			// MarkAtmosphereStateDirty();
		}
	}
	SetHDRMode(NewHDRMode) {
		if (this.m_HDRMode != NewHDRMode) {
			this.m_HDRMode = NewHDRMode;
			// MarkProbeStateDirty ();
		}
	}



}

export { uSkyInternal }