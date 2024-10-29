#pragma once

#include "extralighting.hpp"


class LightGod : public StageEntity {
	
public:

	virtual s32 onCreate() override;
	virtual bool updateMain() override;
	virtual s32 onDestroy() override;

	bool changeLighting();

	static void lerpLighting(Lighting::StageLighting& current, const Lighting::StageLighting& target, fx32 step);
	static void lerpColor(GXRgb& color, GXRgb target, fx32 step);

	static constexpr u16 ObjectID = 46;

	static constexpr ObjectInfo objectInfo = {
		0, 0,
		0, 0,
		0, 0,
		0, 0,
		CollisionSwitch::None
	};

	static constexpr u16 UpdatePriority = ObjectID;
	static constexpr u16 RenderPriority = 0;
	static constexpr ActorProfile profile = {&constructObject<LightGod>, UpdatePriority, RenderPriority};

	fx32 timer;
	fx32 lightChangeLength;
	u32 targetLightProfileID;
	bool activateTargetEvent; 	// true to activate, false to deactivate event
	bool singleUse; 			// if true actor is destroyed after switching once
	bool switched;
	u8 triggerEvent;
	u8 targetEvent;
};
