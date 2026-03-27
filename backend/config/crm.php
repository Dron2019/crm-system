<?php

return [
    'roles' => [
        'owner' => [
            'label' => 'Owner',
            'permissions' => ['*'],
        ],
        'admin' => [
            'label' => 'Admin',
            'permissions' => [
                'contacts.view', 'contacts.create', 'contacts.update', 'contacts.delete', 'contacts.export',
                'companies.view', 'companies.create', 'companies.update', 'companies.delete', 'companies.export',
                'deals.view', 'deals.create', 'deals.update', 'deals.delete', 'deals.export',
                'pipelines.view', 'pipelines.create', 'pipelines.update', 'pipelines.delete',
                'activities.view', 'activities.create', 'activities.update', 'activities.delete',
                'notes.view', 'notes.create', 'notes.update', 'notes.delete',
                'tags.view', 'tags.create', 'tags.update', 'tags.delete',
                'team.view', 'team.update', 'team.members.invite', 'team.members.remove', 'team.members.update_role',
                'custom_fields.view', 'custom_fields.create', 'custom_fields.update', 'custom_fields.delete',
                'reports.view',
            ],
        ],
        'member' => [
            'label' => 'Member',
            'permissions' => [
                'contacts.view', 'contacts.create', 'contacts.update',
                'companies.view', 'companies.create', 'companies.update',
                'deals.view', 'deals.create', 'deals.update',
                'pipelines.view',
                'activities.view', 'activities.create', 'activities.update', 'activities.delete',
                'notes.view', 'notes.create', 'notes.update', 'notes.delete',
                'tags.view',
                'team.view',
                'custom_fields.view',
                'reports.view',
            ],
        ],
        'viewer' => [
            'label' => 'Viewer',
            'permissions' => [
                'contacts.view',
                'companies.view',
                'deals.view',
                'pipelines.view',
                'activities.view',
                'notes.view',
                'tags.view',
                'team.view',
                'custom_fields.view',
                'reports.view',
            ],
        ],
    ],
];
