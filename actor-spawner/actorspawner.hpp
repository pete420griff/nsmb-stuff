#pragma once
#include "nsmb.hpp"

class ActorSpawner : public StageEntity {
	
public:

	virtual s32 onCreate() override;
	virtual bool updateMain() override;
	virtual s32 onDestroy() override;

	static constexpr u16 objectID = 22;

	static constexpr u16 updatePriority = objectID;
	static constexpr u16 renderPriority = objectID;
	static constexpr ActorProfile profile = {&constructObject<ActorSpawner>, updatePriority, renderPriority};

	struct ActorSpawnerSettings { 
		u16 objectID;
		s8 offsetX;	
		s8 offsetY;	
    	u32 settings;
    	u16 particleID;	
		s8 particleOffsetX;	
		s8 particleOffsetY;	
    	u16 sfxID;
    	u8 event2;
    	u8 event1;
	};

	void doSpawn();

	bool actorSpawned;
	bool sActor;
	bool sParticles;
	bool sSFX;
	bool sFirstTick;
	bool eventActive;
	bool eventWasActive;
	u8 eventID;	
	u16 spawnDelay;
	u16 timer;
	u16 spawnerSettingsID;
	ActorSpawnerSettings* spawnerSettings;
};