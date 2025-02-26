#include "extralighting.hpp"

namespace Lighting {

	constexpr StageLighting LightingProfiles[] = {

		// 0: Normal
		{
			GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8),
			{{0,-22.5deg,-22.5deg},GX_RGB(31,31,31)}
		}, 

		// 1: World 8 Outside
		{ 
			GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8),
			{{-4.21875deg,14.0625deg,-22.5deg},GX_RGB(27,31,31)}
		}, 

		// 2: Castle/Ghost house
		{
			GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8),
			{{0,22.5deg,-22.5deg}, GX_RGB(31,31,31)}
		},

		// 3: Jungle/Outside water
		{ 
			GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8),
			{{-22.5deg,-132.1875deg,-67.5deg}, GX_RGB(31,31,31)}
		},
		
		// 4: Sunset (unused)
		{ 
			GX_RGB(31,31,31), GX_RGB(15,6,6), GX_RGB(19,16,0),
			{{22.5deg,157.5deg,-90deg}, GX_RGB(31,31,31)}
		},
		
		// 5: Underwater
		{
			GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8),
			{{-8.4375deg,-14.0625deg,-22.5deg}, GX_RGB(31,31,31)}
		},

		// ---------------- YOUR NEW LIGHTING ---------------- //
		
		// REMEMBER: * 22.5deg = 0x1000, values cannot be >= 0x8000 or < -0x8000 (-180deg to 179.99deg);
		//			 * 31 is max value for RGB

		// 6: example - purple gradient
		{
			// Global material colours
			GX_RGB(31,31,31),			// diffuse (apart from player, affects very few models)
			GX_RGB(10,0,10),			// ambient
			GX_RGB(0,0,25),				// emission
			GX_RGB(0,0,0),				// specular (set to 0 implicitly, and will not affect models in the base game (?) unless forced to

			// Lights
			{
				{22.5deg,112.5deg,-22.5deg}, 	// light 0 direction
				GX_RGB(31,0,31),				// light 0 colour
				true							// light 0 on (set to true implicitly)
			},								
												// ... add up to three more lights
		},

		// 7: example - heat lamp
		{		
			GX_RGB(31,31,31),		
			GX_RGB(20,6,5),		
			GX_RGB(20,5,5),
			{{-135deg,11.25deg,-22.5deg}, 
			GX_RGB(31,28,27)}
		},

		// 8: example - silhouette
		{		
			GX_RGB(0,0,0),	
			GX_RGB(0,0,0),		
			GX_RGB(0,0,0),
			{{0,0,0}, 
			GX_RGB(0,0,0)}		
		},

		// 9: four lights example - code generated with Re (https://pete420griff.github.io/nsmb-stuff/)
		{GX_RGB(31,31,31), GX_RGB(0,0,0), GX_RGB(0,0,0),{{90deg,0deg,-180deg}, GX_RGB(31,12,0)},{{-90deg,-90deg,-10deg}, GX_RGB(11,0,14)},{{0deg,90deg,-11.25deg}, GX_RGB(4,1,23)},{{90deg,-33.75deg,67.49deg}, GX_RGB(0,31,9)}},
		
		// 10: Default worldmap lighting
		{
			GX_RGB(31,31,31),GX_RGB(6,6,6),GX_RGB(6,6,14),
			{{-0xae0,-1.0fxs,-0xdc0},GX_RGB(31,31,31)},
		},
		

		// --------------------------------------------------- //

	};

	constexpr u32 NumLightingProfiles = NTR_ARRAY_SIZE(LightingProfiles);

	u32 currentProfileID;


	void setLight(const DirLight& light, GXLightId lightID) {

		Vec3 dir = Vec3(light.direction).normalize();
		NNS_G3dGlbLightVector(lightID, dir.x, dir.y, dir.z);
	  	NNS_G3dGlbLightColor(lightID, light.color);
	  	GFX::lightVectors[lightID] = dir;
	  	GFX::lightColors[lightID] = light.color;
	}

	void setMatLighting(const StageLighting& lighting) {

		GFX::diffuseColor = lighting.diffuse;
		GFX::ambientColor = lighting.ambient;
		GFX::emissionColor = lighting.emission;

		*rcast<GXRgb*>(0x020a3b20) = lighting.specular; // modifying a value in a literal pool lololol

		GFX::updateGlbMaterial();
	}

	ncp_jump(0x020a3b24,0)
	void setLightingFromProfile(u32 profileID) {

		currentProfileID = profileID;
		
		u32 n = 0;
		for (const DirLight& light : LightingProfiles[profileID].lights) {
			if (light.active) 
				setLight(light,scast<GXLightId>(n));
	  		n+=1;
		}

		setMatLighting(LightingProfiles[profileID]);
		setGlbLightMask(LightingProfiles[profileID].getLightMask());
	}

	// unused
	void setMatLightMask(NNSG3dResMdl* pMdl, GXLightMask lightMask) {

		if (pMdl->info.numMat == 0) return;

		for (u32 matID = 0; matID < pMdl->info.numMat; matID++) {
			NNSG3dResMatData* matData = NNS_G3dGetMatDataByIdx(NNS_G3dGetMat(pMdl),matID);
			matData->polyAttr = (matData->polyAttr & ~0xf) | lightMask;
		}
	}

}


// replaces polygonAttr call in StageCamera::onCreate to not modify light mask
ncp_call(0x020ce5b0,10)
static void setGlbPolyAttr(int r0, GXPolygonMode r1, GXCull r2, int r3, int r4, int r5) {
	NNS_G3dGlbPolygonAttr(NNS_G3dGlb.prmPolygonAttr & 0xf, r1, r2, r3, r4, r5);
}

ncp_call(0x02019984) // Model::create
static void onModelSetup(NNSG3dRenderObj *pRenderObj,NNSG3dResMdl *pResMdl) {

	NNS_G3dRenderObjInit(pRenderObj,pResMdl);
	
	NNS_G3dMdlUseGlbLightEnableFlag(pResMdl); // use global light mask

	bool useGlbSpecular = true;

	// if the specular of any material in model resource is not 0 don't use global specular
	for (u32 matIdx = 0; matIdx < pResMdl->info.numMat; matIdx++) {
		NNSG3dResMatData* matData = NNS_G3dGetMatDataByIdx(NNS_G3dGetMat(pResMdl),matIdx);
		if ((matData->specEmi & 0xffff) > 0) {
			useGlbSpecular = false;
		}
	}

	if (useGlbSpecular)
		NNS_G3dMdlUseGlbSpec(pResMdl);
}

// don't reset lighting if view does not change
ncp_jump(0x02118a44, 10) // Player::viewTransitState
NTR_NAKED static void noLightSwitchInSameView() {asm(R"(
	ldrb	r2, [r8,#0x2be] 	@ store previous view
	strb 	r0, [r8,#0x2be] 	@ keep replaced instruction
	mov 	r5, r0				@ store next view
	beq 	0x02118a5c
	ldrb	r0, [r8,#0x2be]
	bl 		0x020a16a8
	cmp 	r2, r5 		@ compare previous with next view
	beq 	0x02118a5c 	@ skip Stage::setLighting if the same
	b 		0x02118a54
)");}
