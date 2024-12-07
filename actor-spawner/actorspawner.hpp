#pragma once

#include <nsmb.hpp>

class ActorSpawner : public StageEntity {

public:

	struct SpawnBitfield : BitFlag<u8> {
		bool particles 	: 1; 	//0x01
		bool sfx 		: 1; 	//0x02
		bool actor 		: 1; 	//0x04
		bool firstTick 	: 1; 	//0x08
	};

	struct SpawnerSettings { 
		u16 objectID;
		s8 offsetX;	
		s8 offsetY;	
    	u32 settings;
    	u16 particleID;	
		s8 particleOffsetX;	
		s8 particleOffsetY;	
    	u32 sfxID;
	};

	virtual s32 onCreate() override;
	virtual bool updateMain() override;
	virtual s32 onDestroy() override;

	void doSpawn();

	static constexpr u16 ObjectID = 22;

	static constexpr ObjectInfo objectInfo = {
		0, 16,
		2, 2,
		0, 0,
		0, 0,
		CollisionSwitch::None,
	};

	static constexpr u16 UpdatePriority = ObjectID;
	static constexpr u16 RenderPriority = ObjectID;
	static constexpr ActorProfile profile = {&constructObject<ActorSpawner>, UpdatePriority, RenderPriority};

	SpawnerSettings* spawnerSettings;
	s32 stageObjID;
	u16 spawnDelay;
	u16 timer;
	SpawnBitfield spawnMode;
	u8 spawnerSettingsID;
	bool actorSpawned;
	bool eventActive;
	bool eventWasActive;
	u8 eventID;	
};
