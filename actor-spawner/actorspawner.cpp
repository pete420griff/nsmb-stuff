#include "actorspawner.hpp"

// replaces actor 22
ncp_over(0x020399D4) static const ActorProfile* profile = &ActorSpawner::profile;
ncp_over(0x020c542c,0) static const ObjectInfo objectInfo = ActorSpawner::objectInfo;
	
s32 ActorSpawner::onCreate() {

	spawnerSettingsID = settings >> 16 & 0xff;
	spawnerSettings = rcast<SpawnerSettings*>(scast<u8*>(Stage::stageBlocks.objectBanks) + 16 + spawnerSettingsID*16);
	
	spawnMode |= ~(settings >> 12 & 0xf);
	spawnDelay = settings & 0xfff;

	eventID = Stage::eventData[0];
	eventWasActive = false;
	actorSpawned = false;
	timer = 0;

	stageObjID = -1;
	
	for (auto i = 0; i < NTR_ARRAY_SIZE(Stage::objectIDTable); i++) {
		if (spawnerSettings->objectID == Stage::objectIDTable[i]) {
			stageObjID = i;
			break;
		}
	}

	return 1;
}

void ActorSpawner::doSpawn() {

	Vec3 pos = position;
	pos.x += spawnerSettings->offsetX * 1.0fx;
	pos.y += spawnerSettings->offsetY * 1.0fx;

	if (spawnMode.actor) {
		u16 objID = spawnerSettings->objectID;
		if (stageObjID == -1) {
			Actor::spawnActor(objID, spawnerSettings->settings, &pos);
		} else {
			Stage::spawnObject(scast<u32>(stageObjID), spawnerSettings->settings, &pos);
		}
	}

	pos.x += spawnerSettings->particleOffsetX * 1.0fx;
	pos.y += spawnerSettings->particleOffsetY * 1.0fx;

	if (spawnMode.particles) Particle::Handler::createParticle(spawnerSettings->particleID, pos);
	if (spawnMode.sfx) Sound::playSFXUnique(spawnerSettings->sfxID, &pos);

	actorSpawned = true;
}

bool ActorSpawner::updateMain() {

	if (eventID == 0 && spawnDelay == 0) return true;

	if (spawnDelay == 0) {

		if (Stage::getEvent(eventID) && actorSpawned) return true;

		if (!Stage::getEvent(eventID) && actorSpawned) {
			actorSpawned = false;
		} else if (Stage::getEvent(eventID) && !actorSpawned) {
			doSpawn();
		}

	} else {

		if (eventID == 0) {
			eventActive = true;
		} else {
			eventActive = Stage::getEvent(eventID);
		}

		if (eventWasActive && !eventActive) timer = 0;

		if (eventActive) {
			if (spawnMode.firstTick && !eventWasActive) {
				doSpawn();
			} else if (timer > spawnDelay) {
				doSpawn();
				timer = 0;
			}

			timer++;
		}

		eventWasActive = eventActive;
	}

	destroyInactive(0);

	return true;
}

s32 ActorSpawner::onDestroy() {
	return 1;
}
