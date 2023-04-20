// / <summary>
// / This is the sun and moon direction controller that is responsible for triggerring Time changes.
// / This script needs to be attached to a GameObject.
// / It will work as standalone component with uSkySun and uSkyMoon.
// / </summary>

import {
	Matrix4,
	Quaternion,
	Vector3
} from "../../../build/t3d.module.js";
import {
	uSkyInternal
} from "./uSkyInternal.js"
var m_LST, m_Sin_Lat, m_Cos_Lat;
var uskyInternal = new uSkyInternal();
class USkyTimeline {

	constructor(params) {
		this.type = 0; // uSkyInternal.TimeSettingsMode.Default;
		this.isPlaying = params.isPlaying;
		// this.PlayAtRuntime = null;
		this.uSkyPro = params.uSkyPro;

		// [Space (5)][Range(0.0, 24.0)][Tooltip ("Time of the day.")]
		this._timeline = params.timeline; // 17.0;

		this.sunAndMoon = // new DefaultTimelineSettings
			{
				sunDirection: 0,
				sunEquatorOffset: 0,
				moonPositionOffset: 0
			};

		this.locationAndDate = // new RealisticTimelineSettings
			{
				latitude: 0.0,
				longitude: 0.0,
				day: 0,
				month: 4,
				year: 2016, // <--- To expose "Year" in the Inspector? then remove the hide flag in uSkySettings.cs and disable the auto sync code on Awake().
				GMTOffset: 0
			};

		this.dayNightCycle = // new DayNightCycleSettings
			{
				playAtRuntime: false,
				// cycleSpeedCurve : new AnimationCurve (new Keyframe (0.0, 1.25), new Keyframe (0.4, 1.25), new Keyframe (0.5, 1.0), new Keyframe (1.0, 1.0)),
				playSpeed: 0.005,
				steppedInterval: 2,
			};

		this.m_Sun = params.sunDirectionLight; // new uSkySun();//	{ get{ return uSkySun.instance; }}
		this.m_Moon = params.moonDirectionLight; // new uSkyMoon();//  { get{ return uSkyMoon.instance;}}
		this.material = params.material;
		var m_SpaceMatrix = new Matrix4();
		var m_isAwake;
		this._UpdateSunAndMoonDirection = null;

		var m_AccumulatedTime, m_ActualTime;

		var that = this;
		this.Awake(that);
		this.OnEnable();
	}
	Awake(that) {
		var date = new Date();

		that.Year = date.getFullYear(); // <--- //获取完整的年份(4位) automatically sync the Year from current system
		that.Month = date.getMonth(); // 获取当前月份(0-11,0代表1月)

		that.Day = date.getDate(); // 获取当前日(1-31)

		// date.getTime(); //获取当前时间(从1970.1.1开始的毫秒数)

		// date.getHours(); //获取当前小时数(0-23)

		// Initial and cache all the data to uSkyInternal
		uskyInternal.InitTimelineParameters(that);
		that.m_isAwake = true;
	}

	OnEnable() {
		if (!this.m_isAwake) { Awake(); }

		// if(instance && instance != this)
		//     console.log("Unexpected: uSkyTimeline.instance already set (to: {0}). Still overriding with: {1}.", instance.name, name);

		// instance = this;

		// start uBuilder
		// this.UpdateSunAndMoonDirection = true;
		this.UpdateSunAndMoonDirection();
		// end

		// uskyInternal.UpdateTimelineEvent.AddListener (UpdateSunAndMoonDirection);
		// uskyInternal.UpdateCycleEvent.AddListener (UpdateTimelineState);
	}

	OnDisable() {
		uskyInternal.UpdateTimelineEvent.RemoveListener(UpdateSunAndMoonDirection);
		uskyInternal.UpdateCycleEvent.RemoveListener(UpdateTimelineState);

		instance = null;
	}

	Start() {
		// This component can only find the sun and moon light instances after the OnEnable call
		// So we do the initialization here for light direction.
		InitSunAndMoonDirection();
		UpdateTimelineState();
	}

	Update() {
		// Check if any timeline parameter is dirty,
		// then update the sun and moon direction.
		this.SetTimelineState();
		if (this.timeline) { this.UpdateSunAndMoonDirection(); }

		if (this.PlayAtRuntime && this.isPlaying)
		// It keeps update the Timeline and Date
		{ UpdateTimeCycle(); }
	}

	// Set and check if any timeline parameter is dirty,
	// If dirty, trigger event to update sun and moon.
	SetTimelineState() {
		uskyInternal.SetTimeMode(this.type); // (int)
		uskyInternal.SetTimeline(this._timeline);

		switch (this.type) {
			case 1:// TimeSettingsMode.Realistic:
				uskyInternal.SetTimelineSettingState(this.locationAndDate);
				break;
			default:
				uskyInternal.SetTimelineSettingState(this.sunAndMoon);
				break;
		}
	}

	// Startup Initialization, no event triggering
	InitSunAndMoonDirection() {
		switch (this.type) {
			case TimeSettingsMode.Realistic:
				SetSunAndMoonRealisticPosition();
				break;
			default:
				SetSunAndMoonDirection();
				break;
		}
	}

	// If dirty, Update is called by UpdateTimelineEvent
	UpdateSunAndMoonDirection() {
		// this.SetSunAndMoonDirection();
		switch (this.type) {
			case 1:// TimeSettingsMode.Realistic:
			{
				this.SetSunAndMoonRealisticPosition();
				break;
			}
			default:
			{
				this.SetSunAndMoonDirection();
				break;
			}
		}

		// trigger the events
		// uskyInternal.MarkLightingStateDirty ();
		// uskyInternal.MarkAtmosphereStateDirty ();

		// console.log("Timeline : Update Sun And Moon.");
	}

	UpdateTimeCycle() {
		m_AccumulatedTime += Time.deltaTime;

		m_ActualTime += Time.deltaTime * PlaySpeed * CycleSpeedCurve.Evaluate(uskyInternal.NormalizedTime(m_Sun, m_Moon));

		if (m_ActualTime > 24) {
			m_ActualTime = 0;
			DateIncrement();
		}

		if (m_AccumulatedTime >= SteppedInterval) {
			this.timeline = m_ActualTime;
			m_AccumulatedTime = 0;
		}
	}

	// / Allow dynamically update the timeline during playing the Day/Night cycle.
	// / Update is called by UpdateCycleEvent
	UpdateTimelineState() {
		m_ActualTime = this.timeline;
	}

	DateIncrement() {
		// Increment Day
		Day += 1;

		// Increment Month and Year
		if (Day > DaysInMonth()) {
			Day = 1;
			Month += 1;
		}
		if (Month > 12) {
			Month = 1;
			Year += 1;
		}
	}

	DaysInMonth() {
		return DateTime.DaysInMonth(Year, Month);
	}

	OnValidate() {
		if (instance == this) {
			this.timeline = Math.Clamp(this.timeline, 0, 24);
			this.SunDirection = Math.Clamp(this.SunDirection, -180, 180);
			this.SunEquatorOffset = Math.Clamp(this.SunEquatorOffset, -60, 60);
			this.MoonPositionOffset = Math.Clamp(this.MoonPositionOffset, -60, 60);

			this.Latitude = Math.Clamp(this.Latitude, -90, 90);
			this.Longitude = Math.Clamp(this.Longitude, -180, 180);
			this.Day = Math.Clamp(this.Day, 1, DaysInMonth());
			this.Month = Math.Clamp(this.Month, 1, 12);
			this.Year = Math.Clamp(this.Year, 1901, 2099);
			this.GMTOffset = Math.Clamp(this.GMTOffset, -14, 14);

			this.PlaySpeed = Math.Max(this.PlaySpeed, 0);
			this.SteppedInterval = Math.Max(this.SteppedInterval, 0);
		}
	}

	// DEFAULT SETTINGS : SUN AND MOON
	// #region SUN AND MOON
	SetSunAndMoonDirection() {
		var t = this.timeline * 360.0 / 24.0 - 90.0;
		var qua1 = new Quaternion();
		var qua2 = new Quaternion();
		qua1.setFromEuler(0, this.SunDirection - 90.0, this.SunEquatorOffset);
		qua2.setFromEuler(t, 0, 0);
		var sunEuler = qua1.multiply(qua2); // Quaternion.Euler (0, SunDirection - 90.0, SunEquatorOffset) * Quaternion.Euler (t, 0, 0);

		if (this.m_Sun) {
			this.m_Sun.quaternion = sunEuler; // transform.rotation = sunEuler;				// sun
			uskyInternal.SetSpaceAndStarsRotation(sunEuler, this.material); // space and stars

			this.m_Sun.position.z = 50 * Math.cos(t * Math.PI / 180);
			this.m_Sun.position.y = 50 * Math.sin(t * Math.PI / 180);
			this.m_Sun.lookAt(new Vector3(), new Vector3(0, 0, 0));
		}

		if ((uskyInternal.m_NightSkyMode == 1 || this.uSkyPro == null) && this.m_Moon) // uSkyPro.instance
		{
			var qua1 = new Quaternion();
			qua1.setFromEuler(180, this.MoonPositionOffset, 180);
			var moonEuler = sunEuler.multiply(qua1); //* Quaternion.Euler (new Vector3 (180, MoonPositionOffset, 180));
			this.m_Moon.quaternion = moonEuler; // moon

			// this.m_Moon.position.z = 50 * Math.cos(t * Math.PI / 180);
			// this.m_Moon.position.y = 50 * Math.sin(t * Math.PI / 180);
			// this.m_Moon.lookAt(new Vector3(), new Vector3(0, 0, 0));
		}

		// console.log("Sun and Moon direction have been updated");
	}



	// REALISTIC SETTINGS : LOCATION AND DATE
	// #region LOCATION AND DATE



	SetSunAndMoonRealisticPosition() {
		var latitude = Math.PI / 180 * Latitude;
		m_Sin_Lat = Math.sin(latitude);
		m_Cos_Lat = Math.cos(latitude);

		var hour = this.timeline - GMTOffset;

		// http://www.stjarnhimlen.se/comp/ppcomp.html

		// Time scale (only works between 1901 to 2099)
		var d = 367 * Year - 7 * (Year + (Month + 9) / 12) / 4 + 275 * Month / 9 + Day - 730530 + hour / 24;

		// obliquity of the ecliptic (Tilt of earth's axis of rotation)
		var oblecl = 23.4393 - 3.563e-7 * d;
		var ecl_rad = Math.PI / 180 * oblecl;
		var sin_ecl = Math.sin(ecl_rad);
		var cos_ecl = Math.cos(ecl_rad);

		if (m_Sun) {
			m_Sun.transform.forward = computeSunPosition(d, hour, sin_ecl, cos_ecl); // sun

			var quaternion = new Quaternion();
			var quaternion2 = new Quaternion();
			var quaternion3 = new Quaternion();
			quaternion.setFromEuler(90 - Latitude, 0, 0);
			quaternion2.setFromEuler(0, Longitude, 0);
			quaternion3.setFromEuler(0, m_LST * Math.Rad2Deg, 0)
			var rotation = quaternion.multiply(quaternion2).multiply(quaternion3); // Quaternion.Euler(90 - Latitude, 0, 0) * Quaternion.Euler(0, Longitude, 0) * Quaternion.Euler(0, m_LST * Math.Rad2Deg, 0);
			uskyInternal.SetSpaceAndStarsRotation(rotation); // space and stars
		}

		if ((uskyInternal.m_NightSkyMode == 1 || this.uSkyPro == null) && m_Moon) // uSkyPro.instance
		{ m_Moon.transform.forward = computeMoonPosition(d, hour, sin_ecl, cos_ecl); } // moon

		conlose.log("Solar and Lunar position have been updated");
	}

	// Sun
	computeSunPosition(d, hour, m_Sin_Ecl, m_Cos_Ecl) {
		// (all in degrees)
		var w = 282.9404 + 4.70935e-5 * d;
		var a = 1.0;
		var e = 0.016709 - 1.151e-9 * d;
		var M = 356.0470 + 0.9856002585 * d;

		// #5
		var v = 0.0;
		var r = 0.0;
		distanceAndTrueAnomaly(Math.PI / 180 * M, e, a, v, r);

		var Ls = v + w; // Longitude of Sun			(degrees)

		localSiderealTime(Ls, hour);

		var Ls_rad = Ls * Math.PI / 180;

		var xs = r * Math.cos(Ls_rad);
		var ys = r * Math.sin(Ls_rad);

		var xe = xs;
		var ye = ys * m_Cos_Ecl;
		var ze = ys * m_Sin_Ecl;

		var RA = Math.Atan2(ye, xe); // Right Ascension of Sun	(radians)
		var Dec = Math.Asin(ze); // Declination of Sun		(radians)
		// var Dec = Math.Atan2 (ze, Math.Sqrt (xe*xe+ye*ye));		// Alt formula

		var Sun_PhiTheta = azimuthalCoordinates(RA, Dec);

		return cartesianCoordinates(Sun_PhiTheta) * -1;
	}

	// Moon
	computeMoonPosition(d, hour, m_Sin_Ecl, m_Cos_Ecl) {
		var N = 125.1228 - 0.0529538083 * d;
		var i = 5.1454;
		var w = 318.0634 + 0.1643573223 * d;
		var a = 60.2666;
		var e = 0.054900;
		var M = 115.3654 + 13.0649929509 * d;

		// #6
		var v = 0.0;
		var r = 0.0;
		distanceAndTrueAnomaly(Math.PI / 180 * M, e, a, v, r);

		var vw_rad = Math.PI / 180 * (v + w);
		var sin_vw = Math.sin(vw_rad);
		var cos_vw = Math.cos(vw_rad);

		var N_rad = Math.PI / 180 * N;
		var sin_N = Math.sin(N_rad);
		var cos_N = Math.cos(N_rad);

		var i_rad = Math.PI / 180 * i;
		var sin_i = Math.sin(i_rad);
		var cos_i = Math.cos(i_rad);

		// #7
		var xh = r * (cos_N * cos_vw - sin_N * sin_vw * cos_i);
		var yh = r * (sin_N * cos_vw + cos_N * sin_vw * cos_i);
		var zh = r * (sin_vw * sin_i);

		// #12
		var xe = xh;
		var ye = yh * m_Cos_Ecl - zh * m_Sin_Ecl;
		var ze = yh * m_Sin_Ecl + zh * m_Cos_Ecl;

		var RA = Math.Atan2(ye, xe); // Right Ascension of Moon	(radians)
		var Dec = Math.Atan2(ze, Math.Sqrt(xe * xe + ye * ye)); // Declination of Moon		(radians)

		var Moon_PhiTheta = azimuthalCoordinates(RA, Dec);

		return cartesianCoordinates(Moon_PhiTheta) * -1;
	}

	distanceAndTrueAnomaly(M, e, a, v, r) {
		// #5 & #6
		var E = M + e * Math.sin(M) * (1 + e * Math.cos(M));

		var xv = a * (Math.cos(E) - e);
		var yv = a * (Math.Sqrt(1 - e * e) * Math.sin(E));

		v = Math.Rad2Deg * Math.Atan2(yv, xv);
		r = Math.Sqrt(xv * xv + yv * yv);
	}

	localSiderealTime(Longitude_Sun, Hour) {
		// #5b
		var UT = 15.0 * Hour;
		var GMST0 = Longitude_Sun + 180.0;
		var GMST = GMST0 + UT;

		m_LST = (GMST + Longitude) * Math.PI / 180;
	}

	azimuthalCoordinates(RightAscension, Declination) {
		// #12b
		var HA = m_LST - RightAscension; // Hour Angle
		var cos_Decl = Math.cos(Declination);

		var x = Math.cos(HA) * cos_Decl;
		var y = Math.sin(HA) * cos_Decl;
		var z = Math.sin(Declination);

		var xhor = x * m_Sin_Lat - z * m_Cos_Lat;
		var yhor = y;
		var zhor = x * m_Cos_Lat + z * m_Sin_Lat;

		var azimuth = Math.Atan2(yhor, xhor) + Math.PI;
		var altitude = Math.Asin(zhor);

		var phi = azimuth;
		var theta = (Math.PI * 0.5) - altitude;

		return new Vector2(phi, theta);
	}

	cartesianCoordinates(Phi_Theta) {
		var v = new Vector3();
		var cosPhi = Math.cos(Phi_Theta.x);
		var sinPhi = Math.sin(Phi_Theta.x);
		var cosTheta = Math.cos(Phi_Theta.y);
		var sinTheta = Math.sin(Phi_Theta.y);

		v.x = sinPhi * sinTheta;
		v.y = cosTheta;
		v.z = cosPhi * sinTheta;

		return v;
	}



	/*
	// Format: Timeline to TimeSpan , Date to DateTime

	TimeSpan uSkyTimeSpan {
	    get { return TimeSpan.FromHours ((double)this.timeline); }
	}

	DateTime uSkyDateTime {
	    get {
	        DateTime date = new DateTime ( Year, Month, Day );
	        return date.Add (uSkyTimeSpan);
	    }
	}
	*/

	// get UpdateSunAndMoonDirection() {
	// 	return this.SetSunAndMoonDirection();
	// }
	// set UpdateSunAndMoonDirection(value) {
	// 	this._UpdateSunAndMoonDirection = value;

	// 	this.SetSunAndMoonDirection();
	// 	// switch (this.type)
	// 	// {
	// 	// case TimeSettingsMode.Realistic:
	// 	//     SetSunAndMoonRealisticPosition ();
	// 	//     break;
	// 	// default:
	// 	//     SetSunAndMoonDirection ();
	// 	//     break;
	// 	// }

	// 	// trigger the events
	// 	// uskyInternal.MarkLightingStateDirty ();
	// 	// uskyInternal.MarkAtmosphereStateDirty ();

	// 	// console.log("Timeline : Update Sun And Moon.");
	// }

	// Switch between Default or Realistic type in Timeline Settings. TimeSettingsMode
	get Type() {
		return this.type;
	}
	set Type(value) {
		this.type = value;
	}


	// Time of the day. Range (0 ~ 24)
	set timeline(value) {
		if (!this.isPlaying) {
			this._timeline = value;
		} else {
			if (value >= 24) { this._timeline = 0.0; } else
			if (value < 0.0) { this._timeline = 24.0; } else { this._timeline = value; }
		}

		this.SetSunAndMoonDirection();
	}

	get timeline() {
		return this._timeline;
	}
	// / Sun direction align horizionally. Range (-180 ~ 180)
	get SunDirection() {
		return this.sunAndMoon.sunDirection;
	}
	set SunDirection(value) {
		this.sunAndMoon.sunDirection = value;
		this.SetSunAndMoonDirection();
	}

	// / Sun Path offset. Range (-60 ~ 60)
	get SunEquatorOffset() {
		return this.sunAndMoon.sunEquatorOffset;
	}
	set SunEquatorOffset(value) {
		this.sunAndMoon.sunEquatorOffset = value;
	}
	// / The moon position offset in "Rotation" night sky.
	// / Range (-60 ~ 60)
	get MoonPositionOffset() {
		return this.sunAndMoon.moonPositionOffset;
	}
	set MoonPositionOffset(value) {
		this.sunAndMoon.moonPositionOffset = value;
	}
	// / Latitude. Range (-90 ~ 90)
	get Latitude() {
		return this.locationAndDate.latitude;
	}
	set Latitude(value) {
		this.this.locationAndDate.latitude = value;
	}

	// /Longitude. Range (-180 ~ 180)
	get Longitude() {
		return this.locationAndDate.longitude;
	}
	set Longitude(value) {
		if (value > 180.0) { value = -180.0; }
		if (value < -180.0) { value = 180.0; }
		this.locationAndDate.longitude = value;
	}
	// / Day. Range (1 ~ 31)
	get Day() {
		return this.locationAndDate.day;
	}
	set Day(value) {
		if (value > 0) { this.locationAndDate.day = value; }
	}

	// /Month. Range (1 ~ 12)
	get Month() {
		return this.locationAndDate.month;
	}
	set Month(value) {
		if (value > 0) { this.locationAndDate.month = value; }
	}

	// / Year. Range (1901 ~ 2099)
	get Year() {
		return this.locationAndDate.year;
	}
	set Year(value) {
		if ((value > 1900) && (value < 2100)) { this.locationAndDate.year = value; }
	}
	// / UTC / Time Zone. Range (-15 ~ 15)
	get GMTOffset() {
		return this.locationAndDate.GMTOffset;
	}
	set GMTOffset(value) {
		if ((value > -15) && (value < 15)) { this.locationAndDate.GMTOffset = value; }
	}
	// Day Night Cycle -------------------------
	// / Enable to Play the Day Night Cycle at runtime
	get PlayAtRuntime() {
		return this.locationAndDate.playAtRuntime;
	}
	set PlayAtRuntime(value) {
		this.locationAndDate.playAtRuntime = value;
	}

	get PlaySpeed() {
		return this.locationAndDate.playSpeed;
	}
	set PlaySpeed(value) {
		this.locationAndDate.playSpeed = value;
	}
	get CycleSpeedCurve() {
		return this.locationAndDate.cycleSpeedCurve;
	}
	set CycleSpeedCurve(value) {
		this.locationAndDate.cycleSpeedCurve = value;
	}
	get SteppedInterval() {
		return this.locationAndDate.steppedInterval;
	}
	set SteppedInterval(value) {
		this.locationAndDate.steppedInterval = value;
	}


} // end class


export {
	USkyTimeline
}