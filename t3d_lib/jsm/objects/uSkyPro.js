import {
	// Attribute,
	// Buffer,
	// Color3,
	// Vector4,
	// Geometry,
	Vector3,
	BLEND_TYPE, BLEND_FACTOR,
	ShaderMaterial,
	Mesh,
} from "../../../build/t3d.module.js";
import {
	NightSkySettings,
	OtherSettings,
	PrecomputeSettings
} from "./uSkysettings.js"

import {
	uStars
} from "./uSkyStars.js"
import {
	uSkyInternal
} from "./uSkyInternal.js"
import { USkyTimeline } from "./uSkyTimeline.js"
var uskyInternal = new uSkyInternal();
class uSkyPro {

	constructor(params) {
		// this.shaderMaterial = params.shaderMaterial;
		this.sunLight = params.sunLight;
		this.m_Moon = this.sunLight.clone();
		var tempPos = this.m_Moon.position.multiplyScalar(-1)
		this.m_Moon.position.set(tempPos.x, tempPos.y, tempPos.z)
		this.exposure = 1.0;
		this.mieScattering = 1.0;
		this.sunAnisotropyFactor = 0.76;
		this.SunSize = 1.0;
		this.disableSunDisk = false;
		this.uST = params.uSkyTimeline;
		// new USkyTimeline({
		// 	sunDirectionLight: this.sunLight,
		// 	moonDirectionLight: this.sunLight,
		// 	uSkyPro: this,
		// 	material: params.shaderMaterial,
		// 	timeline: 12,
		// 	isPlaying: true,

		// });

		var nightMode = 1, // NightModes.Rotation
			nightZenithColor = [51 / 255, 74 / 255, 102 / 255, 255 / 255],
			nightHorizonColor = [72 / 255, 100 / 255, 128 / 255, 128 / 255],
			starIntensity = 1.0,
			outerSpaceIntensity = 0.25,
			moonInnerCorona = [225 / 255, 225 / 255, 225 / 255, 128 / 255],
			moonOuterCorona = [65 / 255, 88 / 255, 128 / 255, 128 / 255],
			moonSize = 1.0;

		this.nightSky = new NightSkySettings(
			nightMode, // NightModes.Rotation
			nightZenithColor,
			nightHorizonColor,
			starIntensity,
			outerSpaceIntensity,
			moonInnerCorona,
			moonOuterCorona,
			moonSize,
		);
		var groundOffset = 0.0,
			altitudeScale = 1.0,
			disableSkyboxOcean = false,
			HDRMode = false;
		this.other = new OtherSettings(
			groundOffset,
			altitudeScale,
			disableSkyboxOcean,
			HDRMode,);
		var atmosphereThickness = 1.0,
			wavelengths = new Vector3(680, 550, 440),
			skyTint = [128 / 255, 128 / 255, 128 / 255, 255 / 255]
			// liufang start
			// groundColor = [189, 213, 224, 255];
		// liufang end
		var inscatterAltitudeSample = 4; // DepthSample.X1
		this.precomputeParams = new PrecomputeSettings(
			atmosphereThickness,
			wavelengths,
			skyTint,
			// liufang start
			// groundColor,
			// liufang end
			inscatterAltitudeSample = inscatterAltitudeSample
		);
		this._AutoApplySkybox = true;
		this.SkyboxMaterial = params.shaderMaterial;
		// this.SkyboxMaterial =new ShaderMaterial({
		// 	vertexShader: params.uskyvs,
		// 	fragmentShader: params.uskyfs,//document.getElementById('fragmentShader').textContent,
		// 	uniforms: {
		// 		_StarIntensity: starIntensity *15,
		// 		_StarRotationMatrix: m_SpaceMatrix.elements,
		// 	}
		// });

		this.m_PrecomputeShader;
		this.m_uStarShader = params.StarShader;
		// var m_PrecomputeMaterial, m_uStarsMaterial;

		// var m_StarsMesh;
		this.m_isAwake = false;

		this.Awake();
		this.OnEnable();
		this.Start();
	}
	Clamp(x, min, max) {
		if (x > max) { return max; }
		if (x < min) { return min; }
		return x;
	}
	CheckMaterialResources() {
		// //Initialize shaders and materials
		// if (this.m_PrecomputeShader == null)
		// 	this.m_PrecomputeShader = Shader.Find("Hidden/uSkyPro/Precompute");
		// m_PrecomputeMaterial = new ShaderMaterial(this.m_PrecomputeShader);
		// m_PrecomputeMaterial.hideFlags = HideFlags.HideAndDontSave;

		// this.m_uStarShader = Shader.Find("Hidden/uSkyPro/uStars_WebGL");

		if (this.m_uStarShader) {
			this.m_uStarsMaterial = new ShaderMaterial(this.m_uStarShader);

			this.m_uStarsMaterial.depthWrite = false;
			this.m_uStarsMaterial.depthTest = false;
			this.m_uStarsMaterial.transparent = true;
			// this.m_uStarsMaterial.blending = t3d.BLEND_TYPE.ADD;
			this.m_uStarsMaterial.blending = BLEND_TYPE.CUSTOM;
			this.m_uStarsMaterial.blendDst = BLEND_FACTOR.DST_ALPHA;// ONE_MINUS_DST_ALPHA//DST_ALPHA
			this.m_uStarsMaterial.blendSrc = BLEND_FACTOR.SRC_ALPHA;
			this.m_uStarsMaterial.needsUpdate = true;
			// this.m_uStarsMaterial.hideFlags = HideFlags.HideAndDontSave;
		}
	}


	SetEnumsAndToggles() {
		uskyInternal.SetNightSkyMode(Number(this.nightSky.nightMode)); // (int)
		uskyInternal.SetHDRMode(this.other.HDRMode);
	}

	Awake() {
		if (!this.sunLight) {
			// var sunLight = GameObject.Find("Directional Light"); // default new scene
			// if (sunLight == null)
			// 	sunLight = GameObject.Find("Directional light"); // new directional light
			// if (sunLight != null && sunLight.GetComponent() == null)
			// 	sunLight.AddComponent();
			// else
			console.warn("Missing Sun! Please apply the <b>uSkySun</b> component to a Directional Light");
		}

		this.CheckMaterialResources();


		if (this.m_StarsMesh == null) {
			var scene = true;
			var Star = new uStars(scene, this.createMesh);
			this.m_StarsMesh = new Mesh();
			var instancedGeometry = Star.InitializeStarfield();
			this.createMesh(instancedGeometry)
		}

		this.m_isAwake = true;
	}

	createMesh(geo) {
		this.m_StarsMesh = new Mesh(geo, this.m_uStarsMaterial);
		this.m_StarsMesh.frustumCulled = false;
	}
	OnEnable() {
		if (!this.m_isAwake) { Awake(); }

		// CheckSkyboxMaterialType();
		// UpdatePrecomputeData();
		this.SetEnumsAndToggles();
		// UpdateKeywords();

		// Initialize all the parameters before any event added
		// uSkyInternal.InitAtmosphereParameters(this);

		// UpdateAmbientSH(); // TODO: Update unity builtin SH, may not need this if uSky have custom SH soluton later on

		// if (instance && instance != this) { console.log("Unexpected: uSkyPro.instance already set (to: {0}). Still overriding with: {1}.", instance.name, name); }

		// instance = this;

		// uSkyInternal.UpdateAtmosphereEvent.AddListener(UpdateMaterialUniform);
		// uSkyInternal.UpdatePrecomputeEvent.AddListener(UpdatePrecomputeData);
	}

	OnDisable() {
		uSkyInternal.UpdateAtmosphereEvent.RemoveListener(UpdateMaterialUniform);
		uSkyInternal.UpdatePrecomputeEvent.RemoveListener(UpdatePrecomputeData);

		instance = null;
	}

	Start() {
		this.UpdateMaterialUniform();

		// if (SkyboxMaterial != null && AutoApplySkybox)
		// 	RenderSettings.skybox = SkyboxMaterial;
		// else
		// if (SkyboxMaterial == null)
		// 	console.warn("Please assign the uSkyboxPro Material in uSkyPro");
	}

	Update() {
		// Set and check state and determines if it is dirty
		uSkyInternal.SetAtmosphereParameterState(this);

		// Draw Star field
		if (this.m_StarsMesh && this.m_uStarsMaterial && this.nightSky.starIntensity > 0.1) {
			scene.add(this.m_StarsMesh);
			// (mesh, position, rotation , matrix ,   material  , layer)
			// Graphics.DrawMesh(this.m_StarsMesh, Vector3.zero, Quaternion.identity, this.m_uStarsMaterial, 0);
		}

		// 打包时地面是黑的，加这里测试下
		if (GroundColor != [189, 213, 224, 255]) { GroundColor = [189, 213, 224, 255]; }
	}

	OnDestroy() {
		if (this.m_StarsMesh) { scene.remove(this.m_StarsMesh); }

		if (uSkyPrecomputeUtil.m_TransmittanceRT) { scene.remove(uSkyPrecomputeUtil.m_TransmittanceRT); }
		if (uSkyPrecomputeUtil.m_InscatterRT) { scene.remove(uSkyPrecomputeUtil.m_InscatterRT); }

		uSkyInternal.RemoveAllEventListeners();

		if (RenderSettings.skybox == SkyboxMaterial) { RenderSettings.skybox = null; }
	}

	// Update is called by UpdatePrecomputedEvent
	UpdatePrecomputeData() {
		// #if !UNITY_EDITOR && ( UNITY_PS4 || UNITY_WEBGL )
		//     uSkyPrecomputeUtil.StartPrecomputeRT (m_PrecomputeMaterial, precomputeParams);	// RenderTexture
		// #else
		uSkyPrecomputeUtil.StartPrecompute(m_PrecomputeMaterial, precomputeParams); // Texture2D
		// #endif
	}

	color3Multyplevalue(color3, value) {
		// (color3.map(rgbValue => { rgbValue *= value }))
		// return color3;
		color3[0] *= value;
		color3[1] *= value;
		color3[2] *= value;
		if (color3[3]) color3[3] *= value;
		return color3;
	}


	// / Updates the uSkyPro material uniforms.
	// Update is called by UpdateAtmosphereEvent
	UpdateMaterialUniform() {
		if (this.SkyboxMaterial) {
			this.SkyboxMaterial.uniforms._uSkyExposure = this.exposure;
			this.SkyboxMaterial.uniforms._uSkyMieG = this.sunAnisotropyFactor;
			this.SkyboxMaterial.uniforms._uSkyMieScale = this.mieScattering;
			// this.SkyboxMaterial.uniforms._SunDirSize = this.SunDirectionAndSize();
			// this.SkyboxMaterial.uniforms._MoonDirSize = this.MoonDirectionAndSize();

			var NightParams = [this.NightFade(), this.MoonFade(), this.NightFade() * this.nightSky.outerSpaceIntensity];
			this.SkyboxMaterial.uniforms._uSkyNightParams =  NightParams;

			this.SkyboxMaterial.uniforms._NightZenithColor = this.color3Multyplevalue(this.nightSky.nightZenithColor, this.NightTimeBrightness() * 0.25);
			this.SkyboxMaterial.uniforms._NightHorizonColor = this.color3Multyplevalue(this.nightSky.nightHorizonColor, this.NightFade() * 0.5);
			this.SkyboxMaterial.uniforms._MoonInnerCorona = [this.nightSky.moonInnerCorona[0] * this.MoonFade(),
				this.nightSky.moonInnerCorona[1] * this.MoonFade(),
				this.nightSky.moonInnerCorona[2] * this.MoonFade(),
				4e2 / this.nightSky.moonInnerCorona[3]];
			this.SkyboxMaterial.uniforms._MoonOuterCorona = [this.nightSky.moonOuterCorona[0] * this.MoonFade() * 0.25,
				this.nightSky.moonInnerCorona[1] * this.MoonFade() * 0.25,
				this.nightSky.moonInnerCorona[2] * this.MoonFade() * 0.25,
				4 / this.nightSky.moonInnerCorona[3]];
			this.SkyboxMaterial.uniforms._StarIntensity = this.nightSky.starIntensity * 5;
			this.SkyboxMaterial.uniforms.OuterSpaceIntensity = this.nightSky.outerSpaceIntensity;

			// update star and outer space rotation if no uSkyTimeline
			if (this.uST == null && this.m_Moon != null) { uSkyInternal.SetSpaceAndStarsRotation(m_Moon.transform.rotation); }

			// this.SkyboxMaterial.uniforms._uSkyGroundColor= GroundColor;
			this.SkyboxMaterial.uniforms._uSkyGroundOffset = this.other.groundOffset * Number(this.precomputeParams.inscatterAltitudeSample); // (float)
			this.SkyboxMaterial.uniforms._uSkyAltitudeScale = this.other.altitudeScale;

			// medium precision uniform for mobile shader
			// this.SkyboxMaterial.uniforms._uSkyExposure_Mediump = Exposure;
			// this.SkyboxMaterial.uniforms._uSkyNightParams_Mediump = NightParams;


			// Local material uniform (the setting will stored in the material Properties)
			if (this.SkyboxMaterial != null) { this.SkyboxMaterial.uniforms._uSkySkyboxOcean = this.other.disableSkyboxOcean ? 0 : 1; }

			// AtmosphereImageEffect material
			this.SkyboxMaterial.uniforms._NightHorizonColorDeferred = this.color3Multyplevalue(this.nightSky.nightHorizonColor, 0.5 * this.NightFade() / Math.max(Math.pow(this.precomputeParams.atmosphereThickness, 0.25), 1));

			// Update Reflection Probe
			// uSkyInternal.MarkProbeStateDirty();
		}

		// Debug.Log ("Material Uniforms updated!");
	}

	_UpdateKeywords() {
		// global shader keywords
		if (HDRMode) { Shader.EnableKeyword("USKY_HDR_MODE"); } else { Shader.DisableKeyword("USKY_HDR_MODE"); }

		if (InscatterAltitudeSample != DepthSample.X1) { Shader.EnableKeyword("USKY_MULTISAMPLE"); } else { Shader.DisableKeyword("USKY_MULTISAMPLE"); }

		if (!DisableSunDisk) { Shader.EnableKeyword("USKY_SUNDISK"); } else { Shader.DisableKeyword("USKY_SUNDISK"); }
	}

	_SunDirectionAndSize() {
		var m_Sun = this.sunLight;
		return this.sunLight ? [-m_Sun.position.x, -m_Sun.position.y, -m_Sun.position.z, this.SunSize] :
			[0.321, 0.766, -0.557, this.SunSize];
	}

	_MoonDirectionAndSize() {
		var m_Moon = this.m_Moon;
		return m_Moon ? [-m_Moon.position.x, -m_Moon.position[1], -m_Moon.position.z, 8 / this.MoonSize] :
			[0.03261126, -0.9445618, -0.3267102, 8 / this.MoonSize];
	}

	// / <see cref="uSkyPro"/>: Day sky brightness at day time. (Ready Only)
	DayTimeBrightness() {
		// DayTime : Based on Bruneton's uMuS Linear function ( modified : calculate at ground/sea level only)
		return this.Clamp(Math.max(this.SunDirectionAndSize()[1] + 0.2, 0.0) / 1.2, 0, 1);
	}

	// / <see cref="uSkyPro"/>: Nights sky brightness at night time. (Ready Only)

	NightTimeBrightness() {
		return 1 - this.DayTimeBrightness();
	}

	// / <see cref="uSkyPro"/>: Space cubemap fade in and out at day/night cycle. (Ready Only)

	NightFade() {
		return Math.pow(this.NightTimeBrightness(), 4);
	}

	// / <see cref="uSkyPro"/>: Moons fade in and out at day/night cycle. (Ready Only)

	MoonFade() {
		return (this.MoonDirectionAndSize()[1] > 0.0) ? Math.max(this.Clamp((this.MoonDirectionAndSize()[1] - 0.1) * Math.PI, 0, 1) * this.NightTimeBrightness() - this.DayTimeBrightness(), 0) : 0;
	}

	// check if it is Mobile material?
	// CheckSkyboxMaterialType()
	// {
	// 	if (SkyboxMaterial && SkyboxMaterial.shader == Shader.Find ("uSkyPro/uSkyboxPro_Mobile"))
	// 		precomputeParams.inscatterAltitudeSample = DepthSample.X1;
	// }


	OnValidate() {
		Exposure = Math.max(Exposure, 0);
		MieScattering = Math.max(MieScattering, 0);
		SunAnisotropyFactor = this.Clamp(SunAnisotropyFactor, 0, 0.9995);
		GroundOffset = Math.max(GroundOffset, 0);
		AltitudeScale = Math.max(AltitudeScale, 0);

		var wavelengthX = this.Clamp(Wavelengths.x, 380, 780);
		var wavelengthY = this.Clamp(Wavelengths.y, 380, 780);
		var wavelengthZ = this.Clamp(Wavelengths.z, 380, 780);
		Wavelengths = new Vector3(wavelengthX, wavelengthY, wavelengthZ);

		// keep this update in editor
		if (instance == this) {
			this.SetEnumsAndToggles();
			this.UpdateKeywords();
			this.CheckSkyboxMaterialType();

			if (SkyboxMaterial && AutoApplySkybox) { RenderSettings.skybox = SkyboxMaterial; }
		}
	}

	SunDirectionAndSize() {
		var m_Sun = this.sunLight;
		return m_Sun ?	[-m_Sun.position.x, -m_Sun.position.y, -m_Sun.position.z, this.SunSize] :
			[0.321, 0.766, -0.557, this.SunSize];
	}

	MoonDirectionAndSize() {
		var m_Moon = this.m_Moon;
		return m_Moon ? [-m_Moon.position.x, -m_Moon.position.y, -m_Moon.position.z, 8 / this.nightSky.moonSize] :
			[0.03261126, -0.9445618, -0.3267102, 8 / this.nightSky.moonSize];
	}


}
export {
	uSkyPro
}