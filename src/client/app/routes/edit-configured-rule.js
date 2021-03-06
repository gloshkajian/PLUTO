import Ember from 'ember';
import RSVP from 'rsvp';
import RulesetEmberizer from '../mixins/ruleset-emberizer';

export default Ember.Route.extend(RulesetEmberizer, {
	poll: Ember.inject.service(),
	model ( params ) {

		return RSVP.hash( {
			rule: this.store.queryRecord( 'configuredrule', {id:params.rule_id}).then((result) => {
				this.emberizeConfiguredRule(result);
				return result;
			},(err) => { throw err; } ),
			importers: this.store.findAll( 'importer' ),
			exporters: this.store.findAll( 'exporter' ),
			defaultTargets: this.store.query('configuredrule', {
				perPage: 25,
				typeFilter: 'target'
			})
		} );
	},
	actions: {
		error ( reason ) {
			alert( reason );
		}
	}
} );
