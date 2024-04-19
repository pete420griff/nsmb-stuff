// Originally written by Ricbent

#include "actorspawner.hpp"

ncp_over(0x020399D4) static constexpr const ActorProfile* profile = &ActorSpawner::profile;

void ActorSpawner::doSpawn() {

	Vec3 sPos = position;
	sPos.y -= 0x10000;		// Origin pos: Bottom-left of sprite

	sPos.x += spawnerSettings->offsetX * 0x1000;
	sPos.y += spawnerSettings->offsetY * 0x1000;

	u16 objID = spawnerSettings->objectID;

	if (sActor) {
		StageEntity* spawnedActor = rcast<StageEntity*>(spawnActor(objID, spawnerSettings->settings, &sPos));
		if (objID == 103 || objID == 185) {
			spawnedActor->collisionSwitch |= 0x4620; // manually set spikedball collision switch lmao
		}						 // has to be a better way of doing this
	}

	sPos.x += spawnerSettings->particleOffsetX * 0x1000;
	sPos.y += spawnerSettings->particleOffsetY * 0x1000;

	if (sParticles) {
		Particle::Handler::createParticle(spawnerSettings->particleID, sPos);
	}

	if (sSFX) {
		Sound::playSFXUnique(spawnerSettings->sfxID, &sPos);
	}

	actorSpawned = true;
}
	
s32 ActorSpawner::onCreate() {

	actorSpawned = false;

	spawnerSettingsID = (settings & 0xFF0000) >> 16;
	spawnerSettings = rcast<ActorSpawnerSettings*>(Stage::stageBlocks.objectBanks + 16 + spawnerSettingsID*16);

	sActor = (settings & 0x4000) == 0;
	sParticles = (settings & 0x1000) == 0;
	sSFX = (settings & 0x2000) == 0;
	sFirstTick = (settings & 0x8000) == 0;

	eventID = settings >> 24;
	eventWasActive = false;
	spawnDelay = settings & 0xFFF;
	timer = 0;

	return 1;
}

bool ActorSpawner::updateMain() {

	if (eventID == 0 && spawnDelay == 0)
		return 1;

	if (spawnDelay == 0) { // no spawn delay set
		if (Stage::getEvent(eventID) && actorSpawned)
			return 1;

		if (!Stage::getEvent(eventID) && actorSpawned) 
			actorSpawned = false;

		if (Stage::getEvent(eventID) && !actorSpawned){ 
			doSpawn();
		}

	} else {
		if (eventID == 0) {
			eventActive = true;
		}
		else
			eventActive = Stage::getEvent(eventID);

		if (eventWasActive && !eventActive)
			timer = 0;

		if (eventActive) {
			if (sFirstTick && !eventWasActive)
				doSpawn();
			if (timer > spawnDelay) {
				doSpawn();
				timer = 0;
			}
			timer++;
		}

		eventWasActive = eventActive;
	}

	destroyInactive(0);

	return 1;
}

s32 ActorSpawner::onDestroy() {
	return 1;
}
