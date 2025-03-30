#include <nsmb/core/filesystem/cache.hpp>
#include <nsmb/core/system/save.hpp>

/*
	World based Cheep Cheep remodel/anim
*/

struct CheepCheepFiles {
	u16 modelID;
	u16 animID;

	constexpr CheepCheepFiles(u16 mdl = 1599, u16 anm = 1598) : modelID(mdl-131), animID(anm-131) {}
};

static constexpr CheepCheepFiles CheepCheepFileIDs[8] = {

	// World 1
	{1594, 1593}, // peach

	{},

	{},

	{},

	{},

	{},

	{},

	{}, // World 8

};

static const u32& currentWorld = Save::mainSave.currentWorld;

ncp_call(0x213ed4c,25) // CheepCheep::loadResources
static void* loadCheepCheepMdl(u32, bool compressed) {
	return FS::Cache::loadFile(CheepCheepFileIDs[currentWorld].modelID,compressed);
}

ncp_call(0x213ed98,25) // CheepCheep::loadResources
static void* loadCheepCheepAnm(u32, bool compressed) {
	return FS::Cache::loadFile(CheepCheepFileIDs[currentWorld].animID,compressed);
}

ncp_call(0x213d944,25) // CheepCheep::onPrepareResources
static void* getCheepCheepMdl() {
	return FS::Cache::getFile(CheepCheepFileIDs[currentWorld].modelID);
}

ncp_call(0x213d950,25) // CheepCheep::onPrepareResources
static void* getCheepCheepAnm() {
	return FS::Cache::getFile(CheepCheepFileIDs[currentWorld].animID);
}
