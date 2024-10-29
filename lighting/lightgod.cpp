#include "lightgod.hpp"

using namespace Lighting;

// replaces actor 46
ncp_over(0x02039a34) static const ActorProfile* profile = &LightGod::profile; 
ncp_over(0x020c560c,0) static const ObjectInfo objectInfo = LightGod::objectInfo;

s32 LightGod::onCreate() {

    targetLightProfileID = settings & 0xff;
    lightChangeLength = (settings >> 8 & 0xff) * 5.0fx;

	if (lightChangeLength == 0 && (Stage::eventData[1] == 0)) {
		if (targetLightProfileID != currentProfileID) 
			setLightingFromProfile(targetLightProfileID);
		destroy(false);
	}

	triggerEvent = Stage::eventData[1];
	targetEvent = Stage::eventData[0];
	activateTargetEvent = !(settings >> 20 & 1);
	singleUse = settings >> 16 & 1;

    timer = lightChangeLength;

    if (triggerEvent > 0) 
    	switched = true;
    else 
    	switched = false;

	return 1;
}

void LightGod::lerpColor(GXRgb& color, GXRgb target, fx32 step) {

	if (color == target) return;

	u16 c[3];
	for (u32 i=0; i<3; i++) {
		c[i] = color >> i*5 & 31;
		c[i] = Math::mul((target >> i*5 & 31) - c[i], step) + c[i];
	}
	color = GX_RGB(c[0],c[1],c[2]);
}

void LightGod::lerpLighting(StageLighting& current, const StageLighting& target, fx32 step) {

	for (u32 i=0; i<4; i++) {
		DirLight& light = current.lights[i];
		const DirLight& tLight = target.lights[i];
		
		if (!light.active) {
			if (tLight.active) light.active = true;
			else continue;			
		}		

		lerpColor(light.color, tLight.color, step);

		Vec3 vec = Vec3(light.direction);
		vec.lerp(Vec3(tLight.direction),step);
		vec = vec.normalize();

		NNS_G3dGlbLightColor(scast<GXLightId>(i),light.color);
		NNS_G3dGlbLightVector(scast<GXLightId>(i),vec.x,vec.y,vec.z);
	}

	lerpColor(current.diffuse, target.diffuse, step);
	lerpColor(current.ambient, target.ambient, step);
	lerpColor(current.emission, target.emission, step);
	lerpColor(current.specular, target.specular, step);

	setMatLighting(current);
}

bool LightGod::changeLighting() {

	if (timer <= 0) {
		switched = true;
		setLightingFromProfile(targetLightProfileID);
		return true;

	} else {
		StageLighting currentLighting = LightingProfiles[currentProfileID];
		fx32 step = Math::div(lightChangeLength-timer, lightChangeLength);
		lerpLighting(currentLighting, LightingProfiles[targetLightProfileID], step);
		setGlbLightMask(LightingProfiles[currentProfileID].getLightMask());

		timer -= 1.0fx;
		return false;
	}
}

bool LightGod::updateMain() {

	if (switched && targetLightProfileID != currentProfileID && triggerEvent != 0) {
		if (Stage::getEvent(triggerEvent)) {
			timer = lightChangeLength;
			switched = false;
		}
	}

	if (!switched) {
		bool done = changeLighting();
		if (done) {
			if (singleUse)
				destroy(false);
			if (activateTargetEvent)
				Stage::events |= (1ULL << (targetEvent - 1)); // Stage::setEvent(targetEvent); ...thanks ed_it
			else
				Stage::clearEvent(targetEvent);
		}
	}

	if (!isInActiveView())
		destroy(false);

	return 1;
}


s32 LightGod::onDestroy() {

	return 1;
}
