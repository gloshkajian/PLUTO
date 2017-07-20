import DS from 'ember-data';

// A rule file, not a rule instance.
export default DS.Model.extend({
    fileName : DS.attr('string'),
    name: DS.attr('string'),
    config: DS.attr()
});
