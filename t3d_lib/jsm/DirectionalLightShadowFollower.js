import { Vector3, Spherical, Sphere, Matrix4 } from 't3d';

const spherical = new Spherical();
const boundingSphere = new Sphere();

class DirectionalLightShadowFollower {

	constructor(light, camera) {
		this.camera = camera;
		this.light = light;

		this.phi = Math.PI / 4;
		this.theta = Math.PI / 4;

		this.up = new Vector3(0, 1, 0);
	}

	update(near, far) {
		const camera = this.camera;
		const light = this.light;

		frustumToSphere(camera.projectionMatrix, near, far, boundingSphere);
		boundingSphere.applyMatrix4(camera.worldMatrix);

		spherical.phi = this.phi;
		spherical.theta = this.theta;
		spherical.radius = boundingSphere.radius;

		const nearOffset = spherical.radius / 500;
		spherical.radius += nearOffset;

		directionFromSpherical(spherical, light.position);

		light.position.add(boundingSphere.center);
		light.lookAt(boundingSphere.center, this.up);
		light.shadow.windowSize = boundingSphere.radius * 2;
		light.shadow.near = nearOffset;
		light.shadow.cameraFar = nearOffset + boundingSphere.radius * 2;
	}

}

function directionFromSpherical(spherical, vector3) {
	const r = Math.sin(spherical.phi);
	vector3.x = r * Math.cos(spherical.theta);
	vector3.y = Math.cos(spherical.phi);
	vector3.z = r * Math.sin(spherical.theta);

	vector3.multiplyScalar(spherical.radius);
}

const inverseProjectionMatrix = new Matrix4();
const vertices = {
	near: [
		new Vector3(),
		new Vector3(),
		new Vector3(),
		new Vector3()
	],
	far: [
		new Vector3(),
		new Vector3(),
		new Vector3(),
		new Vector3()
	]
};

function frustumToSphere(projectionMatrix, fixNear, fixFar, sphere) {
	const isOrthographic = projectionMatrix.elements[2 * 4 + 3] === 0;

	inverseProjectionMatrix.getInverse(projectionMatrix);

	// 3 --- 0  vertices.near/far order
	// |     |
	// 2 --- 1
	// clip space spans from [-1, 1]

	vertices.near[0].set(1, 1, -1);
	vertices.near[1].set(1, -1, -1);
	vertices.near[2].set(-1, -1, -1);
	vertices.near[3].set(-1, 1, -1);
	vertices.near.forEach(function (v) {
		v.applyMatrix4(inverseProjectionMatrix);

		const absZ = Math.abs(v.z);
		if (isOrthographic) {
			v.z *= Math.min(fixNear / absZ, 1.0);
		} else {
			v.multiplyScalar(Math.min(fixNear / absZ, 1.0));
		}
	});

	vertices.far[0].set(1, 1, 1);
	vertices.far[1].set(1, -1, 1);
	vertices.far[2].set(-1, -1, 1);
	vertices.far[3].set(-1, 1, 1);
	vertices.far.forEach(function (v) {
		v.applyMatrix4(inverseProjectionMatrix);

		const absZ = Math.abs(v.z);
		if (isOrthographic) {
			v.z *= Math.min(fixFar / absZ, 1.0);
		} else {
			v.multiplyScalar(Math.min(fixFar / absZ, 1.0));
		}
	});

	sphere.makeEmpty();
	vertices.near.forEach(function(v) {
		sphere.expandByPoint(v);
	});
	vertices.far.forEach(function(v) {
		sphere.expandByPoint(v);
	});
}

export { DirectionalLightShadowFollower };