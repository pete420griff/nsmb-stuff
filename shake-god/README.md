# Shake God

An actor that can start or stop view shake.\
Replaces actor 255, though it can be easily configured to replace any.

To view Shake God's settings within NSMBe, put the following in `[NSMBe root]/stageobjsettings_new.xml`
```xml
<class id="255">
  <name>Shake God</name>
  <flags known="1" complete="0" />
  <category id="21" />
  <notes></notes>
  <files></files>
  <field id="44" type="checkbox" name="Stop shake" values="1" notes="When triggered, stops current shake instead of creating it. WARNING: this will NOT stop shake caused by another Shake God restarting due to its trigger event still being active" />
  <field id="45-48" type="list" name="Shake type" values="0=Config 1,1=Config 2,2=Config 3,3=Config 4,4=Config 5,5=Config 6,6=Config 7,7=Config 8,8=Config 9,9=Config 10" notes="Choose which of 10 configs ViewShaker will use" />
  <field id="40" type="checkbox" name="Single use" values="1" notes="If set actor is destroyed after one shake" />
  <field id="1-8" type="value" name="Trigger ID" values="" notes="" />
  <field id="9-16" type="value" name="Target ID" values="" notes="" />
  <field id="28" type="list" name="Switch mode" values="0=Activates target,1=Deactivates target" notes="If a target ID is set" />
</class>
```
