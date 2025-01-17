#pragma once

#include <nsmb.hpp>

namespace Lighting {

	struct DirLight {
		VecFx16 direction;
		GXRgb color;
		bool active;

		constexpr DirLight(VecFx16 dir = {}, GXRgb col = 0, bool on = true):
			direction(dir), color(col), active(on) 
		{} 
	};

	struct StageLighting {
		GXRgb diffuse;
		GXRgb ambient;
		GXRgb emission;
		GXRgb specular;
		DirLight lights[4];

		constexpr GXLightMask getLightMask() const {
			u32 lightMask = 0;
			for (u32 i=0; i<4; i++) { lightMask |= (lights[i].active ? 1 << i : 0); }
			return scast<GXLightMask>(lightMask);
		}

		constexpr StageLighting() : 
			diffuse(0), ambient(0), emission(0), specular(0), 
			lights{{}, {}, {}, {}} 
		{}

		constexpr StageLighting(
			GXRgb d, GXRgb a, GXRgb e,
			DirLight l0=DirLight({},0,false), DirLight l1=DirLight({},0,false), 
			DirLight l2=DirLight({},0,false), DirLight l3=DirLight({},0,false)
		) : 
			diffuse(d), ambient(a), emission(e), specular(0),
			lights{l0, l1, l2, l3} 
		{}

		constexpr StageLighting(
			GXRgb d, GXRgb a, GXRgb e, GXRgb s,
			DirLight l0=DirLight({},0,false), DirLight l1=DirLight({},0,false), 
			DirLight l2=DirLight({},0,false), DirLight l3=DirLight({},0,false)
		) : 
			diffuse(d), ambient(a), emission(e), specular(s),
			lights{l0, l1, l2, l3} 
		{}
	};

	extern const StageLighting LightingProfiles[];
	extern const u32 NumLightingProfiles;
	extern u32 currentProfileID;

	void setLight(const DirLight& light, GXLightId lightID);
	void setMatLighting(const StageLighting& lighting);
	void setLightingFromProfile(u32 profileID);
	void setMatLightMask(NNSG3dResMdl* pMdl, GXLightMask lightMask);

	NTR_INLINE void setGlbLightMask(GXLightMask lightMask) {
		NNS_G3dGlb.prmPolygonAttr = (NNS_G3dGlb.prmPolygonAttr & ~0xf) | lightMask;
	}

}
