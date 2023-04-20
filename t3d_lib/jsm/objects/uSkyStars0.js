import {
	Vector3,
	Vector4,
    Matrix4,
	Mesh,
    PlaneGeometry,
    Attribute,Buffer,Quaternion,
    BasicMaterial,
	ShaderMaterial
} from "../../../build/t3d.module.js";

// class Star {
//     // public readonly position: Vector3;
//     // public readonly color: Vector4;
 
//     constructor(pos, col)
//     {
//         this.position = pos;
//         this.color = col;
//     }
 
// }
class uStars
{
    constructor(scene,fun){
        this.starSizeScale = 5.0; // if modify this value that will update after click PLAY button in Editor
        this.starQuad = [];
        this.scene = scene;
        // this.shaderMaterial = shaderMaterial;
        this.fun = fun;

        this.InitializeStarfield();
    }
    InitializeStarfield(){

        this.starDistance = 990; // range within the default camera far clipping plane 1000
        this.starSize = this.starDistance / 100 * this.starSizeScale;

        // Load star positions and colors from file with 9110 predefined stars.

        var url = "http://127.0.0.1:5502/examples/resources/uskypro/StarsData.bytes"; 
		function readBytes(url){ 
			fetch(url).then(res => 
			{	
				res.blob().then(blob => { 

					var reader = new FileReader();
					reader.onload = function(e) {
						var bytesArray = new Float32Array(e.target.result);
                        that.instancedGeometry = createInstancedGeoemtry(bytesArray)
                        that.fun(that.instancedGeometry);
                        return that.instancedGeometry
                        // var material = new BasicMaterial()
                        // const instancedMesh = new Mesh(that.instancedGeometry, that.shaderMaterial );
                        // instancedMesh.frustumCulled = false;
                        // that.scene.add(instancedMesh);
                    }; 
					reader.readAsArrayBuffer(blob);
				})
			}
			); 
		}; 
        
        const numberOfStars = 9110;
        // var stars = new Star[numberOfStars];
        
        this.geometry = new PlaneGeometry();
		var instancedGeometry ;//= createInstancedGeoemtry(geometry);
        var that = this;
        readBytes(url);
		

        function createInstancedGeoemtry(bytesArray)
        {
            const matrices = [];
            const colorArray =[];

			const vector = new Vector4();
			let x, y, z, w;

            const position = new Vector3();
			const orientation = new Quaternion();
			const scale = new Vector3();
			const matrix = new Matrix4();
            var NdcMatrix = new Matrix4();
            var rotationMatrix = new Matrix4();
            var color = new Vector4();
            var instanceCount = numberOfStars;
            for (var i = 0; i < numberOfStars; i++)
            {
                position.x = bytesArray[i*6 + 0];
                position.z = bytesArray[i*6 + 1];
                position.y = bytesArray[i*6 + 2]; // Z-up to Y-up
                const switchYZ = new Vector3(-1,1,-1);
                position.multiply(switchYZ);

                color.x = bytesArray[i*6 + 3];
                color.y = bytesArray[i*6 + 4];
                color.z = bytesArray[i*6 + 5];

                // Using Vector3.magnitude term to sort the brightness of star magnitude
                color.w = new Vector3( color.x , color.y , color.z).getLength();

                // fix an over bright star (Sirius)?
                if (color.w > 5.7) {
                    color = color.normalize().multiplyScalar(0.5);
                }
                /*
                Note: To improve performance, we sort stars by brightness and remove less important stars.
                    
                Threshold:
                6.225e-2f	 // 1024 predefined stars.
                3.613e-2f	 // 2047 predefined stars.
                2.0344e-2f	 // 4096 predefined stars.
                */

                //  UNITY_WEBGL
                var threshold = 3.613e-2;
                // if(color.w < threshold) {
                //     instanceCount--;
                //     continue;
                // }

                NdcMatrix = that.BillboardMatrix(position.multiplyScalar(that.starDistance)).clone();
                // NdcMatrix.transpose();
                rotationMatrix.extractRotation(NdcMatrix)
                orientation.setFromRotationMatrix(NdcMatrix)
				orientation.normalize();

				scale.set(that.starSize , that.starSize , that.starSize );
                // scale.set(2,2,2 );
				matrix.transform(position, scale, orientation);
				matrix.toArray(matrices, i * 16);

                color.toArray(colorArray, i*4);

            }

            const instancedGeometry = that.geometry.clone();
			const instanceMatrixAttribute = new Attribute(new Buffer(new Float32Array(matrices), 16));
			instanceMatrixAttribute.divisor = 1;
			instancedGeometry.addAttribute('instanceMatrix', instanceMatrixAttribute);

            const colorAttribute = new Attribute(new Buffer(new Float32Array(colorArray), 4));
            // colorAttribute.divisor = 1;
			instancedGeometry.addAttribute('instanceColor', colorAttribute);

            instancedGeometry.instanceCount = instanceCount;
			return instancedGeometry;
        }


        // -------------------------------------------
        // Combine Quad Meshes
        // mesh.name = "StarFieldMesh";
        // mesh.CombineMeshes(starQuad.ToArray());
        // ;
        // // over size mesh bounds to avoid camera frustum culling for Vertex transformation in shader 
        // mesh.bounds = new Bounds ( Vector3.zero, Vector3.one * 2e9); // less than 2,147,483,648
        // mesh.hideFlags = HideFlags.HideAndDontSave;

        // //			Debug.Log ("Generated Starfield Successfully");

        // // -------------------------------------------
        // // clean up
        // Resources.UnloadAsset (data);
        // stars = null;
        // starQuad.Clear ();
        // System.GC.Collect();
    }

    createQuad (size){

        var Vertices = [// 4 vertexs for 2 triangles 
            new Vector3( 1, 1, 0) * size,
            new Vector3(-1, 1, 0) * size,
            new Vector3( 1,-1, 0) * size,
            new Vector3(-1,-1, 0) * size]
        ;

        var uv = 
        [
            // 2 triangles uv
            new Vector2(0, 1), 
            new Vector2(1, 1),
            new Vector2(0, 0),
            new Vector2(1, 0)
        ];

        var triangles = new int[6]
        [
            // 2 triangles
            0, 2, 1,
            2, 3, 1
        ];

        m = new Mesh();
        
        m.vertices = Vertices;
        m.uv = uv;
        m.triangles = triangles;
        m.RecalculateNormals();
    //			m.name = "StarSprite"; // debug
        m.hideFlags = HideFlags.HideAndDontSave;
        return m;
    }

    // Billboard will facing the center origin of the GameObject pivot 
    BillboardMatrix (particlePosition)
    {
        var direction = new Vector3(0,0,0);
        direction.subVectors(particlePosition , new Vector3());
        direction.normalize();
        
        var up = new Vector3(0,-1,0);
        var particleRight = new Vector3();
        particleRight.crossVectors( direction , up);
        particleRight.normalize();
        
        var particleUp = new Vector3();
        particleUp.crossVectors( particleRight, direction);
        
        var matrix = new Matrix4();

        // matrix.SetColumn(0, particleRight);		// right
        // matrix.SetColumn(1, particleUp);		    // up
        // matrix.SetColumn(2, direction);			// forward
        // matrix.SetColumn(3, particlePosition);	// position
        matrix.set(particleRight.x*0, particleUp.x*-1, direction.x, particlePosition.x,
            particleRight.y, particleUp.y , direction.y *(1), particlePosition.y,
            particleRight.z*1, particleUp.z *0, direction.z *1, particlePosition.z,
            0, 0, 0, 1)
        // matrix.set(particleRight.x, particleRight.y, particleRight.z, 0,
        //     particleUp.x, particleUp.y, particleUp.z, 0,
        //     direction.x, direction.y, direction.z, 0,
        //     particlePosition.x, particlePosition.y, particlePosition.z, 1)
        return matrix;
    }


}
export { uStars }
