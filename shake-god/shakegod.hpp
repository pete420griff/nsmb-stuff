#pragma once

#include <nsmb.hpp>

class ShakeGod : public StageEntity {
	
public:

	virtual s32 onCreate() override;
	virtual bool updateMain() override;
	virtual s32 onDestroy() override;


	static constexpr u16 ObjectID = 255;

	static constexpr ObjectInfo objectInfo = {
		0, 0,
		0, 0,
		0, 0,
		0, 0,
		CollisionSwitch::None
	};

	static constexpr u16 UpdatePriority = ObjectID;
	static constexpr u16 RenderPriority = 0;
	static constexpr ActorProfile profile = {&constructObject<ShakeGod>, UpdatePriority, RenderPriority};

	bool activateTargetEvent; 	// true to activate, false to deactivate event
	bool singleUse; 			// if true actor is destroyed after one shake
	bool shook;
	bool stopShake;
	u8 shakeType;
	u8 triggerEvent;
	u8 targetEvent;
};
