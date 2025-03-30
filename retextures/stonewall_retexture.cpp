#include <nsmb/core/system/save.hpp>

/*
	World based stone block/wall retexture
*/

struct StoneBlockFiles {
	u32 block;
	u32 spikeDown;
	u32 spikeUp;
	u32 spikeLeft;
	u32 spikeRight;

	constexpr StoneBlockFiles(u32 blk=1691, u32 spkD=1498, u32 spkU=1499, u32 spkL=1496, u32 spkR=1497)
		: block(blk-131), spikeDown(spkD-131), spikeUp(spkU-131), spikeLeft(spkL-131), spikeRight(spkR-131) {}
};

static constexpr StoneBlockFiles stoneBlockFileIDs[8] = {
	
	// world 1
	{
		1691, 	// block
		1498,	// down spike
		1499,	// up spike
		1496,	// left spike
		1497,	// right spike
	},

	// world 2
	{
		1691,	// valid
				// spike files filled in implicitly
	},

	{},			// also valid

	{},

	{},

	{},

	{},

	// world 8
	{},
};


static const u32& currentWorld = Save::mainSave.currentWorld;

ncp_hook(0x20f966c,10) // SpikedStoneBlock::loadFiles
static void setNewStoneBlockLoadFiles() {
	const StoneBlockFiles* blockFilesEntry = &stoneBlockFileIDs[currentWorld];
	*rcast<const StoneBlockFiles*(*)>(0x020f9698) = blockFilesEntry;
	*rcast<const void*(*)>(0x020f969c) = rcast<const void*>(blockFilesEntry + 1);
}

ncp_hook(0x20f9620,10) // prepareResources
static void setStoneBlockGetFiles() {
	*rcast<const StoneBlockFiles*(*)>(0x020f9668) = &stoneBlockFileIDs[currentWorld];
}
