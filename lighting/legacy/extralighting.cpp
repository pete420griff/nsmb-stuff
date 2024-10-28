#include "nsmb.hpp"

struct StageLight {
	VecFx16 direction;
	GXRgb color;
	GXRgb diffuse;
	GXRgb ambient;
	GXRgb emission;
};

static const StageLight newViewLightingTable[] = {
	// 0: Normal
	{{0,-1.0fxs,-1.0fxs}, GX_RGB(31,31,31), GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8)}, 

	// 1: World 8 Outside
	{{-0.1875fxs,0.625fxs,-1.0fxs}, GX_RGB(27,31,31), GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8)}, 

	// 2: Castle/Ghost house
	{{0,1.0fxs,-1.0fxs}, GX_RGB(31,31,31), GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8)},

	// 3: Jungle/Outside water
	{{-1.0fxs,-5.875fxs,-3.0fxs}, GX_RGB(31,31,31), GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8)},
	
	// 4: Sunset (unused)
	{{1.0fxs,7.0fxs,-4.0fxs}, GX_RGB(31,31,31), GX_RGB(31,31,31), GX_RGB(15,6,6), GX_RGB(19,16,0)},
	
	// 5: Underwater
	{{-0.375fxs,-0.1875fxs,-1.0fxs}, GX_RGB(31,31,31), GX_RGB(31,31,31), GX_RGB(6,6,6), GX_RGB(10,9,8)},

	// ---------------- YOUR NEW LIGHTING ---------------- //
	
	// REMEMBER: 1.0fxs = 0x1000;
	//			direction vector values have to be between -8.0fxs and 8.0fxs - 1;
	//			31 is max value for RGB5, as opposed 255

	// 6: example - purple gradient
	{
		{1.0fxs,5.0fxs,-1.0fxs}, 	// light direction
		GX_RGB(31,0,31),		// colour
		GX_RGB(31,31,31),		// diffuse
		GX_RGB(10,0,10),		// ambient
		GX_RGB(0,0,25),			// emission

	},

	// 7: example - heat lamp
	{
		{-6.0fxs,0.5fxs,-1.0fxs}, 
		GX_RGB(31,28,27),		
		GX_RGB(31,31,31),		
		GX_RGB(20,6,5),		
		GX_RGB(20,5,5),		

	},

	// 8: example - silhouette
	{
		{0,0,0}, 
		GX_RGB(0,0,0),		
		GX_RGB(0,0,0),	
		GX_RGB(0,0,0),		
		GX_RGB(0,0,0),		

	}

	// --------------------------------------------------- //
};


// replaces view lighting table pointer with ours
ncp_over(0x020a3c28,0) static auto* newLightingTablePtr = &newViewLightingTable;

// skips a check to allow lighting IDs above 5
ncp_repl(0x020a3b2c,0,"b 0x020a3b34");
