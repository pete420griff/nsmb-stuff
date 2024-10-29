# Actor Spawner

Ricbent's classic actor spawner hack, rewritten and improved.

To view Actor Spawner's settings within NSMBe, put this in `[NSMBe root]/stageobjsettings_new.xml`
```xml
<class id="22">
  <name>Actor Spawner</name>
  <flags known="1" complete="1" />
  <category id="21" />
  <notes></notes>
  <files></files>
  <field id="9-16" type="value" name="Triggering ID" values="" notes="" />
  <field id="25-32" type="value" name="Settings ID" values="" notes="" />
  <field id="37-48" type="value" name="Spawn Delay" values="" notes="If the specified event is active the actor will spawn every X frames while the event is active. If the event is 0 the spawning cycle begins immediatly." />
  <field id="36" type="checkbox" name="Don't spawn particles" values="1" notes="" />
  <field id="35" type="checkbox" name="Don't play SFX" values="1" notes="" />
  <field id="34" type="checkbox" name="Don't spawn Actor" values="1" notes="" />
  <field id="33" type="checkbox" name="Spawn one time cycle later" values="1" notes="" />
</class>
```

And make sure to replace `[NSMBe root]/sfxID.txt` with the one here. 
Yes, it's less descriptive than the original list, but it is complete, and the extra data editor in the current version of NSMBe cannot handle incomplete lists.
