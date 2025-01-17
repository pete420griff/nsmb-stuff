#include <nsmb/core/filesystem/cache.hpp>
#include <nsmb/core/system/save.hpp>


/*
	World based spike top remodel/anim
*/

struct SpikeTopFiles {
	u32 modelID;
	u32 animID;

	constexpr SpikeTopFiles(u32 mdl=1642, u32 anm=1554) 
		: modelID(mdl-131), animID(anm-131) {}
};


static constexpr SpikeTopFiles spikeTopFileIDs[8] = {

	//model, anim
	{ 1642, 1554 }, 	// world 1
	{ 1642, },			// ...
	{},
	{},
	{},
	{},
	{},
	{},					// world 8

};


static const u32& currentWorld = Save::mainSave.currentWorld;

ncp_call(0x2178138,68) // SpikeTop::onPrepareResources
static void* getSpikeTopModel() {
	return FS::Cache::getFile(spikeTopFileIDs[currentWorld].modelID);
}

ncp_call(0x2178144,68) // SpikeTop::onPrepareResources
static void* getSpikeTopAnim() {
	return FS::Cache::getFile(spikeTopFileIDs[currentWorld].animID);
}


ncp_call(0x2177880,68) // SpikeTop::loadResources
static void loadSpikeTopModel(u32, bool compressed) {
	FS::Cache::loadFile(spikeTopFileIDs[currentWorld].modelID, compressed);
}

ncp_call(0x217788c,68) // SpikeTop::loadResources
static void loadSpikeTopAnim(u32, bool compressed) {
	FS::Cache::loadFile(spikeTopFileIDs[currentWorld].animID, compressed);
}
