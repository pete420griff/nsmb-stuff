#include "shakegod.hpp"

// replaces actor 255
ncp_over(0x02039d78) static const ActorProfile* profile = &ShakeGod::profile; 
ncp_over(0x020c5fd0, 0) static const ObjectInfo objectInfo = ShakeGod::objectInfo;

s32 ShakeGod::onCreate() {

	triggerEvent = Stage::eventData[1];
	targetEvent = Stage::eventData[0];
	activateTargetEvent = !(settings >> 20 & 1);
	singleUse = settings >> 8 & 1;

    shakeType = settings & 0xf;
    stopShake = settings >> 4 & 0xf;

	return 1;
}

bool ShakeGod::updateMain() {

	ViewShaker::Config* currentConfig = (rcast<ViewShaker::Config(*)[2]>(0x0212ad28))[getClosestPlayer(nullptr,nullptr)->playerID];
	bool noShake = (currentConfig->start == 0 && currentConfig->end == 0);

	if (stopShake) {
		bool triggered = Stage::getEvent(triggerEvent);

		if (!triggered) shook = false;

		if (!shook && (triggerEvent == 0 || triggered)) {
			currentConfig->start = 0;
			currentConfig->end = 0;
			shook = true;
		}

		if (singleUse || !isInActiveView()) destroy(false);
		return 1;
	}
	
	if (!shook && (triggerEvent == 0 || Stage::getEvent(triggerEvent)) && noShake) {
		ViewShaker::start(shakeType,viewID);
		shook = true;
	} 
	else if (shook && noShake) {
		if (activateTargetEvent)
			Stage::setEvent(targetEvent);
		else
			Stage::clearEvent(targetEvent);

		if (singleUse) destroy(false);
		shook = false;
	}

	if (!isInActiveView())
		destroy(false);

	return 1;
}


s32 ShakeGod::onDestroy() {

	return 1;
}
