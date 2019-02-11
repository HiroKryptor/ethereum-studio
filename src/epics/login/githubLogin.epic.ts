// Copyright 2019 Superblocks AB
//
// This file is part of Superblocks Lab.
//
// Superblocks Lab is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation version 3 of the License.
//
// Superblocks Lab is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Superblocks Lab.  If not, see <http://www.gnu.org/licenses/>.

import {empty, of, from, pipe} from 'rxjs';
import { ofType } from 'redux-observable';
import { authActions, userActions } from '../../actions';
import {
    withLatestFrom,
    tap,
    switchMap,
    catchError,
    mergeMap
} from 'rxjs/operators';
import PopupWindow from '../../components/login/github/PopupWindow';
import { AnyAction } from 'redux';
import { authService, userService } from '../../services';
import {IUser} from '../../models';

interface IQueryParams {
    client_id: string;
    scope: string;
    redirect_uri: string;

    [key: string]: string;

}

const toQuery = (params: IQueryParams, delimiter = '&') => {
    const keys = Object.keys(params);

    return keys.reduce((str, key, index) => {
        let query = `${str}${key}=${params[key]}`;

        if (index < (keys.length - 1)) {
            query += delimiter;
        }
        return query;
    }, '');
};

export const githubLogin = (action$: AnyAction, state$: any) => action$.pipe(
    ofType(authActions.GITHUB_LOGIN),
    withLatestFrom(state$),
    switchMap(() => {
        const scope = 'user:email';
        const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID || '';
        const redirectUri = process.env.REACT_APP_GITHUB_REDIRECT_URI || '';
        return of(toQuery({
            client_id: clientId,
            scope,
            redirect_uri: redirectUri,
        }))
            .pipe(
                switchMap((query: string) => from(PopupWindow.open(
                    'github-oauth-authorize',
                    `https://github.com/login/oauth/authorize?${query}`,
                    { height: 1000, width: 600 })
                )),
                tap((data: any) => console.log(data)),
                switchMap((data: any) => from(authService.githubAuth(data))),
                switchMap(() => from(userService.getUser())),
                tap((user: any) => console.log(user)),
            mergeMap((data: IUser) => [userActions.setProfilePicture(data), authActions.loginSuccess(data)])
            );
    }),
    catchError((err: any) => {
        console.log('Error: ', err);
        return empty();
    })
);